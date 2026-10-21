import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
const source = await readFile(new URL('../../../src/lib/tw-stage-controls.js', import.meta.url), 'utf8');
const {createStageControlsService} = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('stage controls register hidden, update, focus, and dispose without retaining callbacks', () => {
    const service = createStageControlsService();
    let changes = 0;
    let clicks = 0;
    let focuses = 0;
    const unsubscribe = service.subscribe(() => changes++);
    const handle = service.api.addButton({id: 'reload', label: '設定', onClick: () => clicks++});
    assert.equal(service.snapshot()[0].visible, false);
    handle.update({visible: true, text: '監視中', expanded: true});
    const button = service.snapshot()[0];
    assert.equal(button.text, '監視中');
    assert.equal(button.expanded, true);
    button.onClick();
    button.ref({focus: () => focuses++});
    handle.focus();
    assert.equal(clicks, 1);
    assert.equal(focuses, 1);
    handle.update({visible: false});
    handle.focus();
    assert.equal(focuses, 1);
    handle.dispose();
    assert.deepEqual(service.snapshot(), []);
    unsubscribe();
    assert.equal(changes, 4);
});

test('replaced registrations survive stale updates and disposal, and project clearing removes controls', () => {
    const service = createStageControlsService();
    const old = service.api.addButton({id: 'reload', label: '古い設定', onClick() {}});
    const next = service.api.addButton({id: 'reload', label: '設定', onClick() {}});
    old.update({label: 'stale', visible: true});
    old.dispose();
    assert.equal(service.snapshot()[0].label, '設定');
    next.update({visible: true});
    service.clear();
    next.update({visible: true});
    assert.deepEqual(service.snapshot(), []);
    assert.throws(() => service.api.addButton({id: '', label: '設定', onClick() {}}), TypeError);
});
