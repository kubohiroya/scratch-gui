import {test} from 'node:test';
import assert from 'node:assert/strict';

import {
    hostIgnoresKeyEvent,
    hostIntegration,
    hostModalDefaults,
    hostModalNames,
    hostTranslationsFor,
    registerHostBlockShapes,
    withHostSecurityModals,
    withHostThemeTokens
} from '../../../src/lib/tw-plus-integration-points.js';
import {openHostModal} from '../../../src/reducers/modals.js';

// Opening a point must be safe on its own: with nothing supplied the GUI keeps doing exactly what
// it did, which is what lets each implementation move across the boundary later and alone.
test('with nothing supplied every point leaves the GUI unchanged', () => {
    assert.deepEqual(hostIntegration(), {});
    assert.deepEqual(hostModalNames(null), []);
    assert.deepEqual(hostModalDefaults(null), {});
    assert.deepEqual(withHostSecurityModals({Fetch: 'Fetch'}, null), {Fetch: 'Fetch'});
    assert.deepEqual(withHostThemeTokens({a: '#000'}, 'light', null), {a: '#000'});
    assert.deepEqual(hostTranslationsFor('ja', null), {});
    assert.equal(hostIgnoresKeyEvent({}, null), false);
    assert.equal(registerHostBlockShapes({}, null), undefined);
});

test('a supplied integration adds to what the GUI has without replacing it', () => {
    const integration = {
        modals: ['blockEditorModal', 'saveFormatModal'],
        securityModals: {LoadExtensions: 'LoadExtensions'},
        themeTokens: {light: {'block-editor-error-text': '#a61b1b'}, dark: {'block-editor-error-text': '#ff8a80'}},
        translations: {ja: {'twp.save': '保存'}}
    };
    assert.deepEqual(hostModalNames(integration), ['blockEditorModal', 'saveFormatModal']);
    assert.deepEqual(hostModalDefaults(integration), {blockEditorModal: false, saveFormatModal: false});
    assert.deepEqual(withHostSecurityModals({Fetch: 'Fetch'}, integration),
        {Fetch: 'Fetch', LoadExtensions: 'LoadExtensions'});
    assert.deepEqual(withHostThemeTokens({a: '#000'}, 'dark', integration),
        {a: '#000', 'block-editor-error-text': '#ff8a80'});
    assert.deepEqual(hostTranslationsFor('JA', integration), {'twp.save': '保存'});
    assert.deepEqual(hostTranslationsFor('en', integration), {});
});

test('a point the host did not fill is skipped rather than called', () => {
    assert.equal(hostIgnoresKeyEvent({}, {}), false);
    assert.equal(registerHostBlockShapes({}, {}), undefined);
});

// A host that answers badly must not swallow stage input, so only an exact true counts.
test('only an exact true keeps a key event away from the stage', () => {
    assert.equal(hostIgnoresKeyEvent({}, {shouldIgnoreKeyEvent: () => true}), true);
    for (const answer of ['yes', 1, {}, null, undefined]) {
        assert.equal(hostIgnoresKeyEvent({}, {shouldIgnoreKeyEvent: () => answer}), false);
    }
});

test('the block shapes point receives ScratchBlocks once', () => {
    const seen = [];
    const ScratchBlocks = {marker: true};
    registerHostBlockShapes(ScratchBlocks, {registerBlockShapes: blocks => seen.push(blocks)});
    assert.deepEqual(seen, [ScratchBlocks]);
});

// A typo must fail where it is written, not dispatch an action no reducer knows.
test('a modal the host did not declare cannot be opened', () => {
    assert.throws(() => openHostModal('saveFormatModal'), /declared no modal named saveFormatModal/);
});
