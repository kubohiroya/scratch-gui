/**
 * How this fork consults the integration the distributing host supplied.
 *
 * `tw-plus-integration.js` is the module a host replaces, so it holds nothing but the socket. The
 * helpers here are the fork's own. Each takes what the GUI already has and what the host supplied
 * and merges them, and each takes the integration as an argument rather than reading it, so a test
 * can hand one in and every call site stays a single line.
 *
 * Every point is optional. With nothing supplied each helper returns its input unchanged, which is
 * what makes opening a point safe on its own: the GUI keeps doing exactly what it did, and the
 * implementation moves across later, one at a time.
 */

import {plusIntegration} from './tw-plus-integration.js';

/**
 * What the host supplied, or an empty integration.
 * @returns {object} The integration, never null.
 */
export const hostIntegration = () => plusIntegration() || {};

/**
 * Extra modal names the host owns.
 * @param {object} [integration] The host's integration.
 * @returns {string[]} The names, empty when the host supplied none.
 */
export const hostModalNames = integration => [...(integration?.modals || [])];

/**
 * Those names as closed modals, to merge into the reducer's initial state.
 * @param {object} [integration] The host's integration.
 * @returns {object} A name to false map, empty when the host supplied none.
 */
export const hostModalDefaults = integration =>
    Object.fromEntries(hostModalNames(integration).map(name => [name, false]));

/**
 * Extra security prompts the host owns.
 * @param {object} modals The prompts this fork defines.
 * @param {object} [integration] The host's integration.
 * @returns {object} The prompts with the host's added.
 */
export const withHostSecurityModals = (modals, integration) => ({...modals, ...(integration?.securityModals || {})});

/**
 * Extra colour tokens for one theme, so host UI can be themed with the GUI.
 * @param {object} colors The tokens this theme defines.
 * @param {string} theme The theme name, `light` or `dark`.
 * @param {object} [integration] The host's integration.
 * @returns {object} The tokens with the host's added.
 */
export const withHostThemeTokens = (colors, theme, integration) =>
    ({...colors, ...(integration?.themeTokens?.[theme] || {})});

/**
 * The host's messages for one locale. Locales match in lower case, as tw translations do.
 * @param {string} locale The locale being filled.
 * @param {object} [integration] The host's integration.
 * @returns {object} The messages, empty when the host has none for this locale.
 */
export const hostTranslationsFor = (locale, integration) =>
    integration?.translations?.[String(locale).toLowerCase()] || {};

/**
 * Let the host register its own block shapes once ScratchBlocks exists.
 * @param {object} ScratchBlocks The loaded ScratchBlocks.
 * @param {object} [integration] The host's integration.
 * @returns {void}
 */
export const registerHostBlockShapes = (ScratchBlocks, integration) => {
    integration?.registerBlockShapes?.(ScratchBlocks);
};

/**
 * Whether a key event belongs to host UI and must not reach the stage. Anything but true leaves
 * the event to the GUI, so a host that answers badly cannot swallow input.
 * @param {object} event The keyboard event.
 * @param {object} [integration] The host's integration.
 * @returns {boolean} True only when the host claimed the event.
 */
export const hostIgnoresKeyEvent = (event, integration) => integration?.shouldIgnoreKeyEvent?.(event) === true;

/**
 * Let the host attach to the workspace once a VM exists. The host receives the VM, the current
 * locale, the document and a way to reach ScratchBlocks, and returns something to dispose; the
 * fork owns when that happens and never looks inside.
 * @param {object} context What the host needs to attach: vm, locale, document, getBlockly.
 * @param {object} [integration] The host's integration.
 * @returns {object|null} A disposable, or null when the host attached nothing.
 */
export const attachHostToWorkspace = (context, integration) => integration?.attachToWorkspace?.(context) || null;

/**
 * Return to the default project, which is what this fork does when no host decides otherwise.
 * @param {object} initialState The reducer's initial state.
 * @param {string} defaultProjectId The id of the default project.
 * @param {object} loadingStates The reducer's LoadingState map.
 * @returns {object} The next project state.
 */
const defaultCancelSecurityLoad = (initialState, defaultProjectId, loadingStates) =>
    Object.assign({}, initialState, {
        loadingState: loadingStates.FETCHING_NEW_DEFAULT,
        projectId: defaultProjectId
    });

/**
 * What cancelling a load leaves behind.
 *
 * The host cannot import the reducer's `initialState`, `LoadingState` or `defaultProjectId`, so
 * they are handed in. That is what makes a point like this possible: the reducer keeps the values
 * and the host may keep the decision. With nothing supplied the default below runs, so the fork
 * behaves on its own exactly as it did.
 * @param {object} initialState The reducer's initial state.
 * @param {string} defaultProjectId The id of the default project.
 * @param {object} loadingStates The reducer's LoadingState map.
 * @param {object} [integration] The host's integration.
 * @returns {object} The next project state.
 */
export const createCancelSecurityLoad = (initialState, defaultProjectId, loadingStates, integration) =>
    (integration?.createCancelSecurityLoad || defaultCancelSecurityLoad)(
        initialState, defaultProjectId, loadingStates);
