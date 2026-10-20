import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFeatureFlags} from '../../../src/lib/tw-feature-flags.js';

test('common layout is a fixed startup opt-in gated by block dialogs', () => {
    for (const query of ['', '?blockEditorCommonLayout=1', '?blockEditorDialogs=1',
        '?blockEditorDialogs=1&blockEditorCommonLayout=true']) {
        assert.equal(readFeatureFlags(query).blockEditorCommonLayout, false);
    }
    const flags = readFeatureFlags('?blockEditorDialogs=1&blockEditorSourceForms=1&blockEditorCommonLayout=1');
    assert.equal(flags.blockEditorDialogs, true);
    assert.equal(flags.blockEditorSourceForms, true);
    assert.equal(flags.blockEditorCommonLayout, true);
    assert.equal(flags.blockEditorFixedInputs, false);
    assert.ok(Object.isFrozen(flags));
});
