const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {createRequire} = require('node:module');
const hostRequire = createRequire(path.resolve(__dirname, '../../../package.json'));
const babel = hostRequire('@babel/core');
const source = path.resolve(__dirname, '../../../src/lib/tw-packager-integration-hoc.jsx');
const transformed = babel.transformFileSync(source, {babelrc: false, configFile: false,
    presets: [[hostRequire.resolve('@babel/preset-env'), {targets: {node: 'current'}, modules: 'commonjs'}], hostRequire.resolve('@babel/preset-react')]}).code;
const tick = () => new Promise(resolve => setImmediate(resolve));
const buffer = manifest => new TextEncoder().encode(JSON.stringify({targets: [], extensions: [], extensionURLs: {},
    ...(manifest ? {turboWarpPlus: {schemaVersion: 1, extensions: [{id: 'sample', execution: 'unsandboxed', sha256: 'a'.repeat(64), source: {type: 'remote', url: 'https://example.test/code.js'}}]}} : {})})).buffer;
function fixture(search = '', plus = true) {
    const opened = [], posted = [];
    let saves = 0;
    const popup = {closed: false, location: {href: ''}, close() { this.closed = true; },
        postMessage(...args) { posted.push(args); }};
    const location = {search, href: 'https://editor.test/turbowarp-plus-editor/editor.html', origin: 'https://editor.test'};
    const window = {open(url) { opened.push(url); return popup; }, alert() {}, addEventListener() {}, removeEventListener() {}};
    const module = {exports: {}};
    const requireMock = name => {
        if (name === 'react-redux') return {connect: () => component => component};
        if (name === '../config/extension-project-limits.js') return hostRequire(path.resolve(__dirname, '../../../src/config/extension-project-limits.js'));
        if (name === '../config/extension-loader-flag.js') return hostRequire(path.resolve(__dirname, '../../../src/config/extension-loader-flag.js'));
        if (name === './log') return {error() {}};
        if (name === '../reducers/project-state') return {getIsShowingProject: () => true};
        return hostRequire(name);
    };
    new Function('require', 'module', 'exports', 'window', 'location', 'process', transformed)(requireMock, module, module.exports, window, location, {env: {ROOT: '/turbowarp-plus-editor/'}});
    const Class = module.exports.default(() => null);
    const component = new Class({canOpenPackager: true, reduxProjectTitle: 'Fixture', vm: {async saveProjectSb3() { saves++; return buffer(plus); }}});
    return {component, location, opened, popup, posted, saves: () => saves};
}

test('Packager defaults on while explicit opt-out stays fixed after URL changes', async () => {
    const f = fixture('?twPlusExtensionLoader=0');
    f.location.search = '?twPlusExtensionLoader=1';
    f.component.handleClickPackager();
    assert.equal(f.opened[0], 'https://packager.turbowarp.org/?import_from=https://editor.test');
    assert.equal(f.saves(), 0);
    const enabled = fixture();
    enabled.location.search = '?twPlusExtensionLoader=0';
    enabled.component.handleClickPackager();
    await tick();
    assert.equal(enabled.popup.location.href, 'https://editor.test/turbowarp-plus-editor/plus-packager.html');
});

test('Plus project bytes are transferred only to the owned same-origin local Packager', async () => {
    const f = fixture('?twPlusExtensionLoader=1');
    f.component.handleClickPackager();
    await tick();
    f.component.handleMessage({origin: 'https://attacker.test', source: f.popup, data: {twPlusPackage: {type: 'ready'}}});
    f.component.handleMessage({origin: f.location.origin, source: {}, data: {twPlusPackage: {type: 'ready'}}});
    assert.equal(f.posted.length, 0);
    f.component.handleMessage({origin: f.location.origin, source: f.popup, data: {twPlusPackage: {type: 'ready'}}});
    assert.equal(f.posted.length, 1);
    assert.equal(f.posted[0][0].twPlusPackage.type, 'project');
    assert.equal(f.posted[0][1], f.location.origin);
    assert.equal(f.posted[0][2][0], f.posted[0][0].twPlusPackage.bytes);
});

test('Manifestless project retains stock Packager and asynchronous imports recheck Plus ownership', async () => {
    const ordinary = fixture('?twPlusExtensionLoader=1', false);
    ordinary.component.handleClickPackager();
    await tick();
    assert.equal(ordinary.popup.location.href, 'https://packager.turbowarp.org/?import_from=https://editor.test');
    const plus = fixture('?twPlusExtensionLoader=1');
    plus.component.handleMessage({origin: 'https://packager.turbowarp.org', source: plus.popup, data: {p4: {type: 'ready-for-import'}}});
    await tick();
    assert.deepEqual(plus.posted.map(args => args[0].p4.type), ['start-import', 'cancel-import']);
    assert.equal(plus.popup.location.href, 'https://editor.test/turbowarp-plus-editor/plus-packager.html');
});
