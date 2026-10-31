import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import Zip from '@turbowarp/jszip';
import {createExtensionAuthoringController} from '../../../src/lib/tw-plus-extension-authoring.js';

const code = id => new TextEncoder().encode(`Scratch.extensions.register({getInfo(){return {id:'${id}',name:'Test',blocks:[]}}});`);
async function fixture(authorize = async () => ({allowed: true})) {
    const project = {targets: [], extensions: [], extensionURLs: {}, meta: {semver: '3.0.0'}};
    const original = await new Zip().file('project.json', JSON.stringify(project)).generateAsync({type: 'uint8array'});
    const vm = new EventEmitter();
    vm.extensionManager = {isExtensionLoaded: () => false};
    vm.saveProjectSb3 = async () => original;
    const loads = [];
    vm.loadProject = async bytes => { loads.push(bytes); controller.projectLoadStarted(); };
    const fetched = [];
    const controller = createExtensionAuthoringController(vm, {zip: Zip, ports: {
        fetcher: {async fetch(url) {
            fetched.push(url);
            return {bytes: code('remoteexample'), finalURL: url, redirects: []};
        }},
        trustProvider: {async authorize(spec) {
            return {...await authorize(spec), scope: 'digest', sha256: spec.sha256};
        }}
    }});
    return {controller, loads, original, fetched};
}
const file = id => ({id, bytes: code(id), distribution: 'embedded', execution: 'sandboxed'});

test('multiple files are all approved before one project mutation', async () => {
    const approved = [];
    const f = await fixture(async spec => {
        assert.equal(f.loads.length, 0);
        approved.push(spec.id);
        return {allowed: true};
    });
    const manifest = await f.controller.addCustom([file('first'), file('second')]);
    assert.ok(approved.includes('first') && approved.includes('second'));
    assert.equal(f.loads.length, 1);
    const archive = await Zip.loadAsync(f.loads[0]);
    const saved = JSON.parse(await archive.file('project.json').async('string'));
    assert.deepEqual(saved.turboWarpPlus, manifest);
    assert.deepEqual(saved.extensions, ['first', 'second']);
    for (const spec of manifest.extensions) assert.equal(spec.execution, 'sandboxed');
    f.controller.dispose();
});

test('denial of a later file leaves the original project untouched', async () => {
    const f = await fixture(async spec => ({allowed: spec.id !== 'second'}));
    await assert.rejects(f.controller.addCustom([file('first'), file('second')]), {code: 'TRUST_DENIED'});
    assert.equal(f.loads.length, 0);
    assert.deepEqual(await f.controller.inspect(), null);
    f.controller.dispose();
});

for (const distribution of ['embedded', 'remote']) {
    test(`URL ${distribution} uses the bounded fetcher and the selected final permission`, async () => {
        const approved = [];
        const f = await fixture(async spec => { approved.push(spec); return {allowed: true}; });
        const manifest = await f.controller.addCustom([{id: 'remoteexample', url: 'https://example.org/custom.js',
            distribution, execution: 'unsandboxed'}]);
        assert.equal(f.fetched.length, 1);
        assert.equal(approved.length, 1);
        assert.equal(approved[0].source.type, distribution);
        assert.equal(approved[0].execution, 'unsandboxed');
        assert.equal(manifest.extensions[0].source.type, distribution);
        assert.equal(f.loads.length, 1);
        f.controller.dispose();
    });
}

test('duplicate IDs and invalid remote sources fail before fetch, approval or project mutation', async () => {
    let approvals = 0;
    const f = await fixture(async () => { approvals++; return {allowed: true}; });
    await assert.rejects(f.controller.addCustom([file('same'), file('same')]));
    await assert.rejects(f.controller.addCustom([{id: 'bad', url: 'http://example.org/bad.js',
        distribution: 'embedded', execution: 'sandboxed'}]));
    assert.equal(f.fetched.length, 0);
    assert.equal(approvals, 0);
    assert.equal(f.loads.length, 0);
    f.controller.dispose();
});
