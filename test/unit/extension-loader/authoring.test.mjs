import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import VM from 'scratch-vm';
import Zip from '@turbowarp/jszip';
import {createExtensionAuthoringController} from '../../../src/lib/tw-plus-extension-authoring.js';
import {installPlusExtensionHost} from '../../../src/lib/tw-plus-extension-host.js';
const require = createRequire(import.meta.url);
const Storage = require('@turbowarp/scratch-storage');
const spec = {id: 'example', sha256: 'a'.repeat(64)};
const prepared = {spec, projectBytes: new Uint8Array([2])};
const deferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return {promise, resolve, reject};
};
function fixture(prepareAddition = async () => prepared, loadResult = async () => {}) {
    const vm = new EventEmitter();
    const original = new Uint8Array([1]);
    const loads = [];
    let controller;
    vm.saveProjectSb3 = async () => original;
    vm.loadProject = bytes => {
        controller.projectLoadStarted();
        loads.push(bytes);
        return loadResult(bytes, loads.length);
    };
    controller = createExtensionAuthoringController(vm, {prepareAddition, ports: {}, zip: {}});
    return {vm, original, loads, controller};
}

test('authoring applies only the core-approved candidate and marks the project dirty', async () => {
    const stage = deferred();
    const {vm, loads, controller} = fixture(() => stage.promise);
    let dirty = 0;
    vm.on('PROJECT_CHANGED', () => dirty++);
    const adding = controller.add({id: 'example'});
    await Promise.resolve();
    assert.equal(loads.length, 0);
    await assert.rejects(controller.add({id: 'other'}), {code: 'PROJECT_BUSY'});
    stage.resolve(prepared);
    assert.equal(await adding, spec);
    assert.deepEqual(loads, [prepared.projectBytes]);
    assert.equal(dirty, 1);
    controller.dispose();
});

test('denied approval never mutates the VM', async () => {
    const {loads, controller} = fixture(async () => { throw Object.assign(new Error('Denied'), {code: 'TRUST_DENIED'}); });
    await assert.rejects(controller.add({id: 'example'}), {code: 'TRUST_DENIED'});
    assert.equal(loads.length, 0);
    controller.dispose();
});

test('registration failure restores the original SB3', async () => {
    const {original, loads, controller} = fixture(undefined, async (bytes, count) => {
        if (count === 1) throw Object.assign(new Error('Wrong ID'), {code: 'REGISTRATION_ID_MISMATCH'});
    });
    await assert.rejects(controller.add({id: 'example'}), {code: 'REGISTRATION_ID_MISMATCH'});
    assert.deepEqual(loads, [prepared.projectBytes, original]);
    controller.dispose();
});

test('failed recovery retains the original SB3 for explicit download', async () => {
    const {original, controller} = fixture(undefined, async () => { throw new Error('Registration failed'); });
    await assert.rejects(controller.add({id: 'example'}), error => {
        assert.equal(error.code, 'PROJECT_RECOVERY_REQUIRED');
        assert.equal(error.originalProject, original);
        return true;
    });
    controller.dispose();
});

test('project edits and project switches cancel pending preparation without restoring stale data', async () => {
    for (const change of ['edit', 'switch']) {
        const stage = deferred();
        const {vm, loads, controller} = fixture(() => stage.promise);
        const adding = controller.add({id: 'example'});
        await Promise.resolve();
        if (change === 'edit') vm.emit('PROJECT_CHANGED');
        else await vm.loadProject(new Uint8Array([9]));
        stage.resolve(prepared);
        await assert.rejects(adding, {code: 'PROJECT_CHANGED'});
        assert.equal(loads.length, change === 'edit' ? 0 : 1);
        controller.dispose();
    }
});

test('a newer queued project is not overwritten after candidate loading fails', async () => {
    const loading = deferred();
    const {vm, loads, controller} = fixture(undefined, async (bytes, count) => {
        if (count === 1) return loading.promise;
    });
    const adding = controller.add({id: 'example'});
    while (loads.length === 0) await Promise.resolve();
    await vm.loadProject(new Uint8Array([9]));
    loading.reject(new Error('Registration failed'));
    await assert.rejects(adding);
    assert.equal(loads.length, 2);
    assert.deepEqual(loads[1], new Uint8Array([9]));
    controller.dispose();
});

test('abort and disposal invalidate prepared candidates', async () => {
    for (const action of ['abort', 'dispose']) {
        const stage = deferred();
        const {loads, controller} = fixture(() => stage.promise);
        const signal = new AbortController();
        const adding = controller.add({id: 'example'}, {signal: signal.signal});
        await Promise.resolve();
        if (action === 'abort') signal.abort();
        else controller.dispose();
        stage.resolve(prepared);
        await assert.rejects(adding, {code: 'PROJECT_CHANGED'});
        assert.equal(loads.length, 0);
        controller.dispose();
    }
});

test('real VM authoring preserves the project and restores prior extensions after ID mismatch', async () => {
    const vm = new VM();
    vm.attachStorage(new Storage());
    let approvals = 0;
    const host = installPlusExtensionHost(vm, {enabled: true, document: undefined,
        requestApproval: async () => { approvals++; return true; }});
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"></svg>';
    const assetId = createHash('md5').update(svg).digest('hex');
    const project = {targets: [{isStage: true, name: 'Stage', variables: {kept: ['kept', 123]}, lists: {},
        broadcasts: {}, blocks: {}, comments: {}, currentCostume: 0,
        costumes: [{name: 'Blank', assetId, dataFormat: 'svg', md5ext: `${assetId}.svg`, rotationCenterX: 240, rotationCenterY: 180}],
        sounds: [], volume: 100, layerOrder: 0, tempo: 60, videoTransparency: 50, videoState: 'off', textToSpeechLanguage: null}],
    monitors: [], extensions: [], meta: {semver: '3.0.0', vm: '2.0.0', agent: 'Authoring fixture'}};
    const input = await new Zip().file('project.json', JSON.stringify(project)).file(`${assetId}.svg`, svg)
        .generateAsync({type: 'uint8array'});
    const bytes = id => new TextEncoder().encode(`Scratch.extensions.register({getInfo(){return {id:'${id}',name:'Sample',blocks:[]}}});`);
    try {
        await vm.loadProject(input);
        const before = JSON.parse(vm.toJSON()).targets;
        await assert.rejects(host.authoring.add({id: 'firstwrong', source: {type: 'embedded'}, bytes: bytes('actual')}));
        assert.deepEqual(host.loader.getState(), {status: 'idle', ids: []});
        await host.authoring.add({id: 'example', source: {type: 'embedded'}, bytes: bytes('example')});
        assert.equal(vm.extensionManager.isExtensionLoaded('example'), true);
        assert.deepEqual(JSON.parse(vm.toJSON()).targets, before);
        const saved = await vm.saveProjectSb3('arraybuffer');
        const zip = await Zip.loadAsync(saved);
        assert.ok(zip.file('extensions/example.js'));
        const prior = JSON.parse(vm.toJSON());
        await assert.rejects(host.authoring.add({id: 'wrong', source: {type: 'embedded'}, bytes: bytes('actual')}));
        assert.equal(vm.extensionManager.isExtensionLoaded('example'), true);
        assert.equal(vm.extensionManager.isExtensionLoaded('wrong'), false);
        assert.equal(vm.extensionManager.isExtensionLoaded('actual'), false);
        assert.deepEqual(JSON.parse(vm.toJSON()), prior);
        assert.deepEqual(host.loader.getState(), {status: 'loaded', ids: ['example']});
        await host.authoring.add({id: 'second', source: {type: 'embedded'}, bytes: bytes('second')});
        assert.equal(vm.extensionManager.isExtensionLoaded('second'), true);
        assert.equal(approvals, 4);
    } finally {
        await host.dispose();
        vm.runtime.dispose();
    }
});
