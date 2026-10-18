import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFeatureFlags} from '../../../src/lib/tw-feature-flags.js';
import exposeBlockEditorAPI from '../../../src/lib/tw-block-editor-capabilities.js';
import {createBlockEditorService} from '@kubohiroya/turbowarp-extension-data-editor/rjsf';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import getBlockEditorService, {fixedMessages} from '../../../src/lib/tw-block-editor-service.js';

const require = createRequire(import.meta.url);

test('all 16 startup combinations gate fixed, source and descendants independently behind dialogs', () => {
    for (let bits = 0; bits < 16; bits++) {
        const names = ['blockEditorDialogs', 'blockEditorSourceForms', 'blockEditorDescendants', 'blockEditorFixedInputs'];
        const raw = names.map((_, index) => Boolean(bits & (1 << index)));
        const query = names.map((name, index) => `${name}=${raw[index] ? '1' : '0'}`).join('&');
        const flags = readFeatureFlags(`?${query}`);
        assert.ok(Object.isFrozen(flags));
        assert.equal(flags.blockEditorDialogs, raw[0]);
        for (let index = 1; index < names.length; index++) assert.equal(flags[names[index]], raw[0] && raw[index], query);
        const api = {apiVersion: 1, register() {}, registerSchema() {}, registerSchemaBundle() {},
            registerSourceEditor() {}, registerFixedInputEditor() {}};
        const visible = exposeBlockEditorAPI(api, flags.blockEditorSourceForms, flags.blockEditorFixedInputs);
        for (const key of ['register', 'registerSchema', 'registerSchemaBundle']) assert.equal(visible[key], api[key]);
        assert.equal(typeof visible.registerSourceEditor, flags.blockEditorSourceForms ? 'function' : 'undefined');
        assert.equal(typeof visible.registerFixedInputEditor, flags.blockEditorFixedInputs ? 'function' : 'undefined');
    }
});

test('fixed input startup requires exactly 1 and defaults OFF', () => {
    for (const query of ['', '?blockEditorFixedInputs=1', '?blockEditorDialogs=1&blockEditorFixedInputs=true',
        '?blockEditorDialogs=0&blockEditorFixedInputs=1']) assert.equal(readFeatureFlags(query).blockEditorFixedInputs, false);
});

test('the legacy two-argument facade hides fixed capabilities and old artifacts never gain a fake API', () => {
    const api = {apiVersion: 1, register() {}, registerSourceEditor() {}, registerFixedInputEditor() {}};
    assert.equal(exposeBlockEditorAPI(api, true).registerFixedInputEditor, undefined);
    assert.equal(exposeBlockEditorAPI(api, true, true), api);
    const legacy = {apiVersion: 1, register() {}};
    assert.equal(exposeBlockEditorAPI(legacy, true, true), legacy);
    assert.equal(exposeBlockEditorAPI(legacy, true, true).registerFixedInputEditor, undefined);
    const inherited = Object.assign(Object.create({registerFixedInputEditor() {}}), legacy);
    assert.equal(exposeBlockEditorAPI(inherited, true, false).registerFixedInputEditor, undefined);
    assert.equal(exposeBlockEditorAPI({...legacy, registerFixedInputEditor: true}, true, true).registerFixedInputEditor, undefined);
});

test('the installed service exposes fixed registration only when the artifact supports the explicit opt-in', t => {
    const legacy = createBlockEditorService();
    const enabled = createBlockEditorService({fixedInputs: true});
    assert.equal(legacy.api.registerFixedInputEditor, undefined);
    if (typeof enabled.api.registerFixedInputEditor !== 'function') {
        t.skip('The installed legacy artifact has no fixed capability; run with the recorded local common artifact for positive coverage.');
        return;
    }
    for (const sourceForms of [false, true]) {
        const api = exposeBlockEditorAPI(enabled.api, sourceForms, true);
        assert.equal(typeof api.registerFixedInputEditor, 'function');
        assert.equal(typeof api.registerSourceEditor, sourceForms ? 'function' : 'undefined');
        assert.equal(exposeBlockEditorAPI(enabled.api, sourceForms, false).registerFixedInputEditor, undefined);
    }
});

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
