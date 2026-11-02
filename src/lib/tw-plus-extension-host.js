import {extensionProjectArchiveOptions} from '../config/extension-project-limits.js';
import JSZip from '@turbowarp/jszip';
import {isExtensionLoaderEnabled} from '../config/extension-loader-flag.js';
import {createExtensionLoader, createFetchPort, DEFAULT_FETCH_RETRY} from '@kubohiroya/turbowarp-extension-loader';
import {createProjectIO} from '@kubohiroya/turbowarp-extension-loader/project-codec';
import {createSessionTrustProvider} from '@kubohiroya/turbowarp-extension-loader/session-trust';
import {createMemoryContentCache} from '@kubohiroya/turbowarp-extension-loader/memory-cache';
import {createVMExtensionRegistrar} from './tw-plus-extension-registrar.js';
import {installExtensionLoader} from './tw-plus-project-loader.js';
import {createPlusPermissionUI} from './tw-plus-permission-ui.js';
import {createExtensionAuthoringController, setExtensionAuthoringHost} from './tw-plus-extension-authoring.js';
import {hostIntegration, hostTrustedCatalog} from './tw-plus-integration-points.js';

const SHA256 = /^[0-9a-f]{64}$/;

/**
 * What a distributed single HTML trusts: only code whose actual bytes match a digest its build
 * embedded. It cannot ask a host — the runtime bundle it carries is built without an integration —
 * and it cannot read any catalog either, because its own CSP forbids the connection. So the
 * decision the build already made travels with it as these digests, and is checked here.
 * @param {string[]} digests The digests embedded when the HTML was built.
 * @returns {object} Trust checks of the shape the loader expects.
 */
const digestTrustedCatalog = digests => {
    const listed = new Set((Array.isArray(digests) ? digests : []).filter(digest => SHA256.test(digest)));
    return Object.freeze({
        isTrustedURL: () => Promise.resolve(false),
        isTrustedCode: code => Promise.resolve(listed.has(code.actualSHA256))
    });
};

// Snapshot before any project is opened; later URL changes cannot toggle this host.
const startupSearch = globalThis.location ? globalThis.location.search : '';

/** Host-controlled wiring shared by the Editor and bundled HTML runtime. */
export function installPlusExtensionHost (vm, {
    enabled = false, document = globalThis.document, locale = 'ja', fetchImpl = globalThis.fetch,
    cache, requestApproval, diagnostics: report, loaderOptions, hostPolicy, trustedCatalog = null, trustedDigests,
    fetchRetry
} = {}) {
    if (enabled !== true) return Object.freeze({enabled: false, dispose: async () => {}});
    // A single HTML has no catalog to read; its build embeds the digests the catalog listed.
    const trusted = trustedCatalog === null && Array.isArray(trustedDigests) ?
        digestTrustedCatalog(trustedDigests) : trustedCatalog;
    const ui = createPlusPermissionUI(document, locale);
    const diagnostics = event => {
        ui.diagnostics(event);
        if (report) report(event);
    };
    // The host owns the retry settings, so only the host can say which attempt of how many this
    // is. The Loader reports the retry it is about to wait for; the attempt it leads to is next.
    const retry = {...DEFAULT_FETCH_RETRY, ...fetchRetry};
    const onRetry = ({url, attempt, delayMs}) => diagnostics({
        type: 'retry',
        attempt: attempt + 1,
        attempts: retry.retries + 1,
        delayMs,
        message: url
    });
    const projectIO = createProjectIO({zip: JSZip, ...extensionProjectArchiveOptions});
    const approve = requestApproval || ui.requestApproval;
    const trustProvider = createSessionTrustProvider({hostPolicy,
        // Catalog-listed code is trusted like TurboWarp's official gallery and needs no separate approval.
        requestApproval: async (code, options) =>
            (trusted !== null && await trusted.isTrustedCode(code)) || approve(code, options)});
    const ports = {
        embeddedReader: projectIO.embeddedReader,
        fetcher: createFetchPort(fetchImpl, {...retry, onRetry}),
        cache: cache || createMemoryContentCache(),
        trustProvider,
        registrar: createVMExtensionRegistrar(vm),
        diagnostics
    };
    const loader = createExtensionLoader(ports, loaderOptions);
    const authoring = createExtensionAuthoringController(vm, {ports, diagnostics, loaderOptions});
    let uninstall;
    try {
        uninstall = installExtensionLoader({vm, projectIO, transactionalRegistration: true,
            onDiagnostic: diagnostics, onProjectLoadStart: authoring.projectLoadStarted}, loader);
    } catch (error) {
        authoring.dispose();
        ui.dispose();
        trustProvider.revokeAll();
        throw error;
    }
    setExtensionAuthoringHost(vm, authoring);
    let disposal;
    return Object.freeze({
        enabled: true, loader, projectIO, authoring,
        dispose () {
            if (!disposal) {
                setExtensionAuthoringHost(vm, null);
                authoring.dispose();
                ui.dispose();
                trustProvider.revokeAll();
                disposal = Promise.resolve(uninstall()).then(() => loader.unload());
            }
            return disposal;
        }
    });
}

export function startupPlusExtensionHost (vm, options = {}) {
    const search = options.search === undefined ? startupSearch : options.search;
    const supplied = hostIntegration();
    const settings = {trustedCatalog: hostTrustedCatalog(supplied), ...options,
        enabled: isExtensionLoaderEnabled(search || '')};
    // A host that supplied its own installer owns this entirely, which is how the implementation
    // below leaves this fork: once every caller goes through the socket, the copy here can go.
    return typeof supplied?.installExtensionHost === 'function' ?
        supplied.installExtensionHost(vm, settings) : installPlusExtensionHost(vm, settings);
}

export const isPlusPermissionDenied = error => error && ['TRUST_DENIED', 'CANCELLED'].includes(error.code);
