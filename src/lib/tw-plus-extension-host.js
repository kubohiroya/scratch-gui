import JSZip from '@turbowarp/jszip';
import {createExtensionLoader, createFetchPort} from '@kubohiroya/turbowarp-extension-loader';
import {createProjectIO} from '@kubohiroya/turbowarp-extension-loader/project-codec';
import {createSessionTrustProvider} from '@kubohiroya/turbowarp-extension-loader/session-trust';
import {createMemoryContentCache} from '@kubohiroya/turbowarp-extension-loader/memory-cache';
import {createVMExtensionRegistrar} from './tw-plus-extension-registrar.js';
import {installExtensionLoader} from './tw-plus-project-loader.js';
import {createPlusPermissionUI} from './tw-plus-permission-ui.js';

// Snapshot before any project is opened; later URL changes cannot enable this host.
const startupSearch = globalThis.location ? globalThis.location.search : '';

/** Host-controlled wiring shared by the Editor and bundled HTML runtime. */
export function installPlusExtensionHost (vm, {
    enabled = false, document = globalThis.document, locale = 'ja', fetchImpl = globalThis.fetch,
    cache, requestApproval, diagnostics: report, loaderOptions, hostPolicy
} = {}) {
    if (enabled !== true) return Object.freeze({enabled: false, dispose: async () => {}});
    const ui = createPlusPermissionUI(document, locale);
    const diagnostics = event => {
        ui.diagnostics(event);
        if (report) report(event);
    };
    const projectIO = createProjectIO({zip: JSZip});
    const trustProvider = createSessionTrustProvider({requestApproval: requestApproval || ui.requestApproval, hostPolicy});
    const loader = createExtensionLoader({
        embeddedReader: projectIO.embeddedReader,
        fetcher: createFetchPort(fetchImpl),
        cache: cache || createMemoryContentCache(),
        trustProvider,
        registrar: createVMExtensionRegistrar(vm),
        diagnostics
    }, loaderOptions);
    let uninstall;
    try {
        uninstall = installExtensionLoader({vm, projectIO, transactionalRegistration: true,
            onDiagnostic: diagnostics}, loader);
    } catch (error) {
        ui.dispose();
        trustProvider.revokeAll();
        throw error;
    }
    let disposal;
    return Object.freeze({
        enabled: true, loader, projectIO,
        dispose () {
            if (!disposal) {
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
    return installPlusExtensionHost(vm, {...options,
        enabled: new URLSearchParams(search || '').get('twPlusExtensionLoader') === '1'});
}

export const isPlusPermissionDenied = error => error && ['TRUST_DENIED', 'CANCELLED'].includes(error.code);
