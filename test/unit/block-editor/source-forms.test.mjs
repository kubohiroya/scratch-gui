import assert from 'node:assert/strict';
import {test} from 'node:test';
import exposeBlockEditorAPI from '../../../src/lib/tw-block-editor-capabilities.js';
import getBlockEditorService from '../../../src/lib/tw-block-editor-service.js';




test('the standard GUI exposes source forms and preserves older artifact capabilities', () => {
    assert.equal(typeof getBlockEditorService({}).api.registerSourceEditor, 'function');
    const legacy = {apiVersion: 1, register() {}};
    assert.equal(exposeBlockEditorAPI(legacy), legacy);
    assert.equal(exposeBlockEditorAPI(legacy).registerSourceEditor, undefined);
    assert.equal(exposeBlockEditorAPI({...legacy, registerSourceEditor: true}).registerSourceEditor, undefined);
});
