/* global __TW_PLUS_LOCAL_CATALOG__ */
import {loadExtensionCatalog, parseExtensionCatalog} from '@kubohiroya/turbowarp-extension-security-dialog';

export const CATALOG_URL = 'https://kubohiroya.github.io/turbowarp-plus-packages/extensions-v1.json';
const preview = typeof __TW_PLUS_LOCAL_CATALOG__ === 'undefined' ? null : __TW_PLUS_LOCAL_CATALOG__;

/**
 * Read the host-selected catalog without changing extension code URL policy.
 * @param {AbortSignal} signal Active catalog request.
 * @param {object} options Host-owned local preview and fetch ports.
 * @returns {Promise<Array<object>>} Validated entries and optional bundled display icons.
 */
export const loadPlusCatalog = async (signal, {localCatalog = preview, fetchCatalog = loadExtensionCatalog} = {}) => {
    if (!localCatalog) return fetchCatalog(CATALOG_URL, signal);
    const check = () => {
        if (signal?.aborted) throw Object.assign(new Error('Catalog loading cancelled'), {code: 'CANCELLED'});
    };
    check();
    const entries = parseExtensionCatalog(localCatalog.catalog);
    const icons = localCatalog.icons || {};
    const ids = new Set(entries.map(entry => entry.id));
    for (const [id, value] of Object.entries(icons)) {
        if (!ids.has(id) || typeof value !== 'string' ||
            !/^data:image\/svg\+xml;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) {
            throw new Error('Invalid host preview icon');
        }
    }
    await Promise.resolve();
    check();
    // Preview image bytes are supplied by the trusted build, not by a project or remote metadata.
    return entries.map(entry => (Object.hasOwn(icons, entry.id) ?
        {...entry, metadata: {...entry.metadata, banner: icons[entry.id]}} : entry));
};
