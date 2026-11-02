import {test} from 'node:test';
import assert from 'node:assert/strict';

import {
    createCancelSecurityLoad,
    hostAwaitedAddonIds,
    hostExtensionCatalog,
    hostIgnoresKeyEvent,
    hostIntegration,
    hostPermissionUI,
    hostTrustedCatalog,
    hostTrustedDigests,
    hostModalDefaults,
    hostModalNames,
    hostTranslationsFor,
    hostStageControls,
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

// The host cannot import the reducer's values, so the point hands them in. With nothing supplied
// the fork's own default runs, which is what keeps this fork working on its own.
test('cancelling a load returns to the default project when no host decides otherwise', () => {
    const initialState = {projectId: null, projectData: 'old', error: new Error('old'), loadingState: 'LOADING'};
    const loadingStates = {FETCHING_NEW_DEFAULT: 'FETCHING_NEW_DEFAULT'};
    const next = createCancelSecurityLoad(initialState, '0', loadingStates, null);
    assert.equal(next.loadingState, 'FETCHING_NEW_DEFAULT');
    assert.equal(next.projectId, '0');
    assert.equal(next.projectData, 'old', 'the rest comes from the initial state');
    assert.notEqual(next, initialState, 'the initial state is not mutated');
});

test('a host may decide what cancelling leaves behind, and receives the values it needs', () => {
    const seen = [];
    const integration = {
        createCancelSecurityLoad: (initialState, defaultProjectId, loadingStates) => {
            seen.push({initialState, defaultProjectId, loadingStates});
            return {loadingState: 'HOST', projectId: defaultProjectId};
        }
    };
    const initialState = {projectId: null};
    const loadingStates = {FETCHING_NEW_DEFAULT: 'FETCHING_NEW_DEFAULT'};
    const next = createCancelSecurityLoad(initialState, '0', loadingStates, integration);
    assert.deepEqual(next, {loadingState: 'HOST', projectId: '0'});
    assert.equal(seen[0].initialState, initialState);
    assert.equal(seen[0].defaultProjectId, '0');
    assert.equal(seen[0].loadingStates, loadingStates);
});

// The controls bar and the Scratch.gui API both ask for the stage controls, and both must get the
// same service for one VM: a control registered through the API has to appear in the bar.
test('the stage controls point is asked per VM and hands back what the host owns', () => {
    const asked = [];
    const services = new Map();
    const integration = {
        stageControls: vm => {
            asked.push(vm);
            if (!services.has(vm)) services.set(vm, {api: {}, snapshot: () => [], subscribe: () => () => {}});
            return services.get(vm);
        }
    };
    const first = {};
    const second = {};
    assert.equal(hostStageControls(first, integration), hostStageControls(first, integration));
    assert.notEqual(hostStageControls(second, integration), hostStageControls(first, integration));
    assert.deepEqual(asked, [first, first, second, first]);
});

test('with no stage controls supplied the point says so instead of inventing a service', () => {
    assert.equal(hostStageControls({}, null), null);
    assert.equal(hostStageControls({}, {}), null);
    assert.equal(hostStageControls({}, {stageControls: () => null}), null);
});

// An addon that patches shared editor internals has to settle before anything reads them. Which
// addon that is depends on what the host does, so the runner asks rather than naming one.
test('the host names the addon ids whose startup must settle first', () => {
    assert.deepEqual(hostAwaitedAddonIds(null), []);
    assert.deepEqual(hostAwaitedAddonIds({}), []);
    assert.deepEqual(hostAwaitedAddonIds({awaitStartupAddons: ['editor-searchable-dropdowns']}),
        ['editor-searchable-dropdowns']);
});

test('the ids are copied, so a host cannot change what the runner already decided to await', () => {
    const supplied = ['one'];
    const integration = {awaitStartupAddons: supplied};
    const ids = hostAwaitedAddonIds(integration);
    supplied.push('two');
    assert.deepEqual(ids, ['one']);
});

// Which catalog a build trusts is the distributor's decision, so the fork asks rather than
// holding an address of its own.
test('the catalog comes from the host, and a build may distribute none', () => {
    assert.equal(hostExtensionCatalog(null), null);
    assert.equal(hostExtensionCatalog({}), null);
    const catalog = {url: 'https://example.test/catalog.json', read: () => ({catalog: {}, icons: {}})};
    assert.equal(hostExtensionCatalog({extensionCatalog: catalog}), catalog);
});

// Which extensions load unsandboxed unreviewed is a statement about a distribution, not about the
// editor, so the fork trusts nothing until a host says what its catalog lists.
test('with no host nothing is trusted, which only means everything is reviewed', async () => {
    const code = {source: {type: 'embedded'}, actualSHA256: 'a'.repeat(64)};
    for (const integration of [null, {}, {trustedExtensions: {}}]) {
        assert.equal(await hostTrustedCatalog(integration).isTrustedURL('https://example.test/a.js'), false);
        assert.equal(await hostTrustedCatalog(integration).isTrustedCode(code), false);
        assert.deepEqual(await hostTrustedDigests({extensions: []}, integration), []);
    }
});

test('the host says what its catalog trusts and which digests a built HTML carries', async () => {
    const integration = {trustedExtensions: {
        catalog: {isTrustedURL: url => Promise.resolve(url === 'https://example.test/listed.js')},
        listDigests: manifest => Promise.resolve(manifest.extensions.map(spec => spec.sha256))
    }};
    assert.equal(await hostTrustedCatalog(integration).isTrustedURL('https://example.test/listed.js'), true);
    assert.equal(await hostTrustedCatalog(integration).isTrustedURL('https://example.test/other.js'), false);
    assert.deepEqual(await hostTrustedDigests({extensions: [{sha256: 'c'.repeat(64)}]}, integration),
        ['c'.repeat(64)]);
});

// Every string and every style in the dialog is the distributor's. A build with none of its own
// cannot ask, so it approves nothing: an extension that needs permission simply does not run.
test('with no dialog supplied nothing is shown and nothing is approved', async () => {
    for (const integration of [null, {}]) {
        const ui = hostPermissionUI(null, 'ja', integration);
        assert.equal(ui.diagnostics({type: 'review'}), undefined);
        assert.equal(await ui.requestApproval({id: 'x'}), false);
        assert.equal(ui.dispose(), undefined);
    }
});

test('the host is asked for its dialog with the document and the locale it is shown in', () => {
    const asked = [];
    const supplied = {diagnostics () {}, requestApproval: () => Promise.resolve(true), dispose () {}};
    const document = {};
    const ui = hostPermissionUI(document, 'en', {createPermissionUI: (...args) => {
        asked.push(args);
        return supplied;
    }});
    assert.equal(ui, supplied);
    assert.deepEqual(asked, [[document, 'en']]);
});
