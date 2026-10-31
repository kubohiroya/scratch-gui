import {extensionProjectArchiveOptions} from '../config/extension-project-limits.js';
import JSZip from '@turbowarp/jszip';
import {isExtensionLoaderEnabled} from '../config/extension-loader-flag.js';
import {createExtensionLoader, createFetchPort} from '@kubohiroya/turbowarp-extension-loader';
import {createProjectIO} from '@kubohiroya/turbowarp-extension-loader/project-codec';
import {createSessionTrustProvider} from '@kubohiroya/turbowarp-extension-loader/session-trust';
import {createMemoryContentCache} from '@kubohiroya/turbowarp-extension-loader/memory-cache';
import {createVMExtensionRegistrar} from './tw-plus-extension-registrar.js';
import {installExtensionLoader} from './tw-plus-project-loader.js';
import {createPlusPermissionUI} from './tw-plus-permission-ui.js';
import {createExtensionAuthoringController, setExtensionAuthoringHost} from './tw-plus-extension-authoring.js';

// Snapshot before any project is opened; later URL changes cannot toggle this host.
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
    const projectIO = createProjectIO({zip: JSZip, ...extensionProjectArchiveOptions});
    const trustProvider = createSessionTrustProvider({requestApproval: requestApproval || ui.requestApproval, hostPolicy});
    const ports = {
        embeddedReader: projectIO.embeddedReader,
        fetcher: createFetchPort(fetchImpl),
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
    return installPlusExtensionHost(vm, {...options,
        enabled: isExtensionLoaderEnabled(search || '')});
}

export const isPlusPermissionDenied = error => error && ['TRUST_DENIED', 'CANCELLED'].includes(error.code);
