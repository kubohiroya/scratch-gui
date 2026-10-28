require('./helpers.cjs');
const {test} = require('node:test');
const assert = require('node:assert/strict');
const load = require('../../../src/lib/tw-plus-extension-loader').default;
const {getPlusReviewedMode, setPlusHostPolicy} = require('../../../src/lib/tw-plus-extension-permissions');

const entries = [
    {id: 'base', url: 'https://example.test/base.js', dependencies: []},
    {id: 'middle', url: 'https://example.test/middle.js', dependencies: ['base']},
    {id: 'app', url: 'https://example.test/app.js', dependencies: ['middle']}
];
const decisions = (...modes) => new Map(entries.map((entry, index) => [entry.url, modes[index] || 'sandboxed']));
function fixture() {
    const loaded = new Set();
    const calls = [];
    const security = {getSandboxMode(url) { return getPlusReviewedMode(security, url) || 'worker'; }};
    const vm = {extensionManager: {
        securityManager: security,
        isExtensionLoaded: id => loaded.has(id),
        async loadExtensionURL(url) {
            calls.push([url, await security.getSandboxMode(url)]);
            loaded.add(entries.find(entry => entry.url === url).id);
        }
    }};
    return {vm, security, loaded, calls};
}

test('Plus loads in dependency order, skips existing IDs and scopes reviewed modes to the batch', async () => {
    const {vm, security, loaded, calls} = fixture();
    const original = security.getSandboxMode;
    loaded.add('base');
    assert.deepEqual(await load(vm, entries, decisions('deny', 'unsandboxed', 'sandboxed')),
        ['base', 'middle', 'app']);
    assert.deepEqual(calls, [[entries[1].url, 'unsandboxed'], [entries[2].url, 'iframe']]);
    assert.equal(security.getSandboxMode, original);
    assert.equal(security.getSandboxMode(entries[1].url), 'worker');
});

test('denying a transitive dependency prevents all dependents from executing', async () => {
    const {vm, calls} = fixture();
    assert.deepEqual(await load(vm, entries, decisions('deny')), []);
    assert.deepEqual(calls, []);
});

test('failures clear reviewed decisions and retain successfully loaded dependencies', async () => {
    const {vm, security, loaded} = fixture();
    const original = vm.extensionManager.loadExtensionURL;
    vm.extensionManager.loadExtensionURL = async url => {
        if (url === entries[1].url) throw new Error('network');
        await original(url);
    };
    await assert.rejects(load(vm, entries, decisions()), /network/);
    assert.deepEqual([...loaded], ['base']);
    assert.equal(getPlusReviewedMode(security, entries[1].url), undefined);
    vm.extensionManager.loadExtensionURL = original;
    assert.deepEqual(await load(vm, entries, decisions()), ['base', 'middle', 'app']);
});

test('host policies retain control of custom permission and sandbox methods', async () => {
    const {vm, security, calls} = fixture();
    security.getSandboxMode = () => 'worker';
    setPlusHostPolicy(security, url => url !== entries[2].url);
    assert.deepEqual(await load(vm, entries, decisions('unsandboxed', 'unsandboxed', 'unsandboxed')),
        ['base', 'middle']);
    assert.deepEqual(calls.map(call => call[1]), ['worker', 'worker']);
    setPlusHostPolicy(security, null);
});

test('missing decisions and incorrect registered IDs fail before a dependent loads', async () => {
    const {vm, calls} = fixture();
    await assert.rejects(load(vm, entries, new Map()), /Missing permission/);
    assert.deepEqual(calls, []);
    vm.extensionManager.loadExtensionURL = async url => calls.push(url);
    await assert.rejects(load(vm, entries, decisions()), /catalog ID/);
    assert.deepEqual(calls, [entries[0].url]);
});

test('library search stays in the Plus category and ordinary tag searches retain their existing behavior', () => {
    const Module = require('node:module');
    const originalLoad = Module._load;
    let LibraryComponent;
    Module._load = function(request, ...args) {
        if (request.startsWith('!')) return 'mock-asset.svg';
        return originalLoad.call(this, request, ...args);
    };
    try {
        ({LibraryComponent} = require('../../../src/components/library/library.jsx'));
    } finally {
        Module._load = originalLoad;
    }
    const library = new LibraryComponent({id: 'extensionLibrary', customTag: 'twplus'});
    library.setState = update => Object.assign(library.state, update);
    library.state.selectedTag = 'twplus';
    library.handleFilterChange({target: {value: 'text'}});
    assert.equal(library.state.selectedTag, 'twplus');
    assert.equal(library.state.filterQuery, 'text');
    library.state.selectedTag = 'scratch';
    library.handleFilterChange({target: {value: 'music'}});
    assert.equal(library.state.selectedTag, 'all');
    assert.equal(library.state.filterQuery, 'music');
});

test('a disposed Plus view does not navigate or update its parent after a delayed load finishes', async () => {
    const PlusLibrary = require('../../../src/containers/tw-plus-library.jsx').default;
    const {vm, loaded} = fixture();
    let finish;
    vm.extensionManager.loadExtensionURL = () => new Promise(resolve => {finish = () => {
        loaded.add('base');
        resolve();
    };});
    const callbacks = [];
    const view = new PlusLibrary({vm, locale: 'en',
        onCategorySelected: () => callbacks.push('category'),
        onRequestClose: () => callbacks.push('close'),
        onBusyChange: () => callbacks.push('busy')});
    view.alive = true;
    view.state.reviewing = [entries[0]];
    view.setState = update => Object.assign(view.state, update);
    const pending = view.handleReview(decisions());
    await new Promise(resolve => setImmediate(resolve));
    view.componentWillUnmount();
    finish();
    await pending;
    assert.deepEqual(callbacks, []);
});
