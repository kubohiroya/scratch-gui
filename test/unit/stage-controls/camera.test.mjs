import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
const source = await readFile(new URL('../../../src/lib/tw-camera-controls.js', import.meta.url), 'utf8');
const {createCameraControlsService} = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('one entry switches from settings to native permission and back after startup', () => {
    const service = createCameraControlsService();
    const settings = service.api.registerProvider({id: 'preview', cameraId: 'pose', kind: 'settings', element: {}});
    service.toggle();
    const prior = service.snapshot();
    const permission = service.api.registerProvider({id: 'request', cameraId: 'pose', kind: 'permission', element: {}});
    assert.equal(service.snapshot().provider.kind, 'permission');
    assert.deepEqual(service.snapshot().cameraIds, ['pose']);
    settings.update({running: true});
    assert.equal(prior.provider.running, false);
    assert.equal(service.snapshot().provider.kind, 'settings');
    permission.dispose();
    assert.equal(service.snapshot().open, true);
    settings.dispose();
    assert.equal(service.snapshot().provider, null);
    assert.equal(service.snapshot().open, false);
});

test('stale handles cannot replace, update, or remove a newer provider', () => {
    const service = createCameraControlsService();
    const old = service.api.registerProvider({id: 'preview', kind: 'settings', element: {}});
    const next = service.api.registerProvider({id: 'preview', kind: 'settings', element: {}, running: true});
    old.update({visible: false, running: false});
    old.dispose();
    assert.equal(service.snapshot().provider.running, true);
    service.clear();
    next.update({visible: true});
    assert.equal(service.snapshot().provider, null);
});

test('logical cameras share one chooser and visibility removes stale selection', () => {
    const service = createCameraControlsService();
    service.api.registerProvider({id: 'a', cameraId: 'a', kind: 'settings', element: {}});
    const second = service.api.registerProvider({id: 'b', cameraId: 'b', kind: 'permission', element: {}});
    service.select('b');
    assert.equal(service.snapshot().cameraId, 'b');
    second.update({visible: false});
    assert.equal(service.snapshot().cameraId, 'a');
    assert.throws(() => service.api.registerProvider({id: '', kind: 'settings', element: {}}), TypeError);
});
