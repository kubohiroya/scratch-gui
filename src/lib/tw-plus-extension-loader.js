import {beginPlusReview, canLoadPlusExtension} from './tw-plus-extension-permissions';

/**
 * Load a reviewed dependency order through the VM without persisting trust.
 * Refused dependencies also prevent their dependents from loading.
 * @param {object} vm The editor VM.
 * @param {Array<object>} entries Dependency-first catalog entries.
 * @param {Map<string, string>} choices Explicit security review decisions.
 * @returns {Promise<Array<string>>} IDs successfully available in the VM.
 */
const loadPlusExtensions = async (vm, entries, choices) => {
    const manager = vm.extensionManager;
    const security = manager.securityManager;
    const modes = new Map();
    const loaded = [];
    const refused = new Set();
    for (const entry of entries) {
        if (!['deny', 'sandboxed', 'unsandboxed'].includes(choices.get(entry.url))) {
            throw new Error(`Missing permission decision: ${entry.id}`);
        }
    }
    const releaseReview = beginPlusReview(security, modes);
    try {
        for (const entry of entries) {
            if (manager.isExtensionLoaded(entry.id)) {
                loaded.push(entry.id);
                continue;
            }
            if (choices.get(entry.url) === 'deny' || entry.dependencies.some(id => refused.has(id))) {
                refused.add(entry.id);
                continue;
            }
            if (entry.dependencies.some(id => !manager.isExtensionLoaded(id))) {
                throw new Error(`An extension dependency was not loaded: ${entry.id}`);
            }
            if (!await canLoadPlusExtension(security, entry.url)) {
                refused.add(entry.id);
                continue;
            }
            modes.set(entry.url, choices.get(entry.url) === 'unsandboxed' ? 'unsandboxed' : 'iframe');
            await manager.loadExtensionURL(entry.url);
            modes.delete(entry.url);
            if (!manager.isExtensionLoaded(entry.id)) {
                throw new Error(`The extension did not register its catalog ID: ${entry.id}`);
            }
            loaded.push(entry.id);
        }
    } finally {
        releaseReview();
    }
    return loaded;
};

export default loadPlusExtensions;
