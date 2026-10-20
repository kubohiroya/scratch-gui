import assert from 'node:assert/strict';
import {test} from 'node:test';
import exposeBlockEditorAPI from '../../../src/lib/tw-block-editor-capabilities.js';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import getBlockEditorService, {fixedMessages} from '../../../src/lib/tw-block-editor-service.js';

const require = createRequire(import.meta.url);









test('fixed labels use the actual GUI Intl locale and preserve one service per VM', () => {
    const {IntlProvider} = require('react-intl');
    const translations = JSON.parse(readFileSync(new URL('../../../src/lib/tw-translations/block-editor.json', import.meta.url)));
    const vm = {};
    let previous;
    for (const locale of ['en', 'ja']) {
        const intl = new IntlProvider({locale, messages: translations[locale]}, {}).getChildContext().intl;
        const labels = fixedMessages(intl);
        for (const key of ['reset', 'readOnly', 'unverified', 'currentValue', 'colorPicker', 'invalidValue', 'inactiveDraft']) {
            assert.equal(labels[key], translations[locale][`tw.blockEditor.fixed.${key}`]);
        }
        const service = getBlockEditorService(vm, intl);
        if (previous) assert.equal(service, previous);
        previous = service;
    }
});
test('the standard service exposes actual fixed input support without a startup switch', () => {
    assert.equal(typeof getBlockEditorService({}).api.registerFixedInputEditor, 'function');
    const legacy = {apiVersion: 1, register() {}};
    assert.equal(exposeBlockEditorAPI(legacy), legacy);
    assert.equal(exposeBlockEditorAPI(legacy).registerFixedInputEditor, undefined);
    assert.equal(exposeBlockEditorAPI({...legacy, registerFixedInputEditor: true}).registerFixedInputEditor, undefined);
});
