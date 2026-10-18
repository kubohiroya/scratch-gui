import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFeatureFlags} from '../../../src/lib/tw-feature-flags.js';
import exposeBlockEditorAPI from '../../../src/lib/tw-block-editor-capabilities.js';
import {createBlockEditorService} from '@kubohiroya/turbowarp-extension-data-editor/rjsf';

test('source forms require both startup opt-ins without changing descendant negotiation', () => {
    for (const query of ['', '?blockEditorSourceForms=1', '?blockEditorDialogs=1',
        '?blockEditorDialogs=1&blockEditorSourceForms=true']) {
        assert.equal(readFeatureFlags(query).blockEditorSourceForms, false);
    }
    const flags = readFeatureFlags('?blockEditorDialogs=1&blockEditorSourceForms=1');
    assert.equal(flags.blockEditorSourceForms, true);
    assert.equal(flags.blockEditorDescendants, false);
    assert.equal(readFeatureFlags('?blockEditorDialogs=1&blockEditorDescendants=1').blockEditorDescendants, true);
    assert.ok(Object.isFrozen(flags));
});

test('OFF exposes the legacy API, ON exposes only capabilities actually provided by the artifact', () => {
    const service = createBlockEditorService();
    const legacy = exposeBlockEditorAPI(service.api, false);
    assert.equal(legacy.apiVersion, 1);
    assert.equal(legacy.registerSourceEditor, undefined);
    for (const key of ['register', 'registerSchema', 'registerSchemaBundle']) assert.equal(legacy[key], service.api[key]);
    assert.equal(exposeBlockEditorAPI(service.api, true), service.api);
    assert.equal(typeof service.api.registerSourceEditor, 'function');
    assert.equal(exposeBlockEditorAPI({apiVersion: 1, register() {}}, true).registerSourceEditor, undefined);
});
