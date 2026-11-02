/**
 * Where a project's extensions are loaded, and who decides how.
 *
 * None of that is this fork's: which Loader packages are used, what the archive limits are, what
 * asks the user, which switch turns the loader on and what counts as already trusted are all
 * decisions about a distribution. The distributing host answers the socket; what comes back is
 * disposed of here, and with no host there is simply no Plus extension loading.
 *
 * What is handed over is what only this fork has. Marking an error as an extension failure and
 * making an authoring controller go as functions, because the project-error paths and the
 * extension library read both back. The VM modules the registration needs go as this fork's own
 * module instances: `central-dispatch` is a singleton, and a copy resolved anywhere else would not
 * be the one the VM uses. The switch and the archive limits go as values, because this fork's own
 * Packager wiring reads the same two and they are defined once, here.
 */

import ScratchCommon from 'scratch-vm/src/extension-support/tw-extension-api-common.js';
import createTranslate from 'scratch-vm/src/extension-support/tw-l10n.js';
import staticFetch from 'scratch-vm/src/util/tw-static-fetch.js';
import dispatch from 'scratch-vm/src/dispatch/central-dispatch.js';

import {extensionProjectArchiveOptions} from '../config/extension-project-limits.js';
import {isExtensionLoaderEnabled} from '../config/extension-loader-flag.js';
import {createExtensionAuthoringController, setExtensionAuthoringHost} from './tw-plus-extension-authoring.js';
import {markExtensionLoadFailure} from './tw-plus-extension-load-failure.js';
import {hostIntegration, hostTrustedCatalog, installHostExtensionHost} from './tw-plus-integration-points.js';

// Snapshot before any project is opened; later URL changes cannot toggle this host.
const startupSearch = globalThis.location ? globalThis.location.search : '';

/**
 * Ask the distributing host to install extension loading for this VM.
 * @param {object} vm The editor VM.
 * @param {object} [options] What the caller knows: locale, document, diagnostics, policy.
 * @param {object} [integration] The host's integration; taken as an argument so a test can hand
 * one in, as every other point in `tw-plus-integration-points.js` is.
 * @returns {object} The installed host, or a disabled one when this build has no loader.
 */
export function startupPlusExtensionHost (vm, options = {}, integration = hostIntegration()) {
    const search = options.search === undefined ? startupSearch : options.search;
    return installHostExtensionHost(vm, {
        enabled: isExtensionLoaderEnabled(search || ''),
        archiveOptions: extensionProjectArchiveOptions,
        vmModules: {ScratchCommon, createTranslate, staticFetch, dispatch},
        trustedCatalog: hostTrustedCatalog(integration),
        markLoadFailure: markExtensionLoadFailure,
        createAuthoring: createExtensionAuthoringController,
        setAuthoringHost: setExtensionAuthoringHost,
        ...options
    }, integration);
}

export const isPlusPermissionDenied = error => error && ['TRUST_DENIED', 'CANCELLED'].includes(error.code);
