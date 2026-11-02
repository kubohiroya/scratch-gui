import {parseExtensionCatalog} from '@kubohiroya/turbowarp-extension-security-dialog';
import {hostExtensionCatalog, hostIntegration} from './tw-plus-integration-points.js';

const SHA256 = /^[0-9a-f]{64}$/;
const empty = Object.freeze({urls: new Set(), digests: new Map(), listedDigests: new Set()});

// Reading through the host keeps the catalog's address out of this fork. A build that supplies
// none reaches the same place as a catalog that cannot be read: nothing is trusted.
const readHostCatalog = async signal => {
    const source = hostExtensionCatalog(hostIntegration());
    if (!source) throw new Error('This build distributes no extension catalog');
    const {catalog} = await source.read(signal);
    if (!catalog) throw new Error('The distributed extension catalog is empty');
    return catalog;
};

/**
 * Extensions listed in the TurboWarp-Plus catalog are trusted like TurboWarp's official gallery:
 * they load unsandboxed without a separate review. Trust requires the listed URL, or the listed
 * SHA-256 for code embedded in a project. A catalog that cannot be read trusts nothing, and the
 * next check reads it again.
 * @param {object} options Host-owned catalog reader and timeout.
 * @returns {object} Trust checks for extension URLs and verified Loader code.
 */
export const createPlusTrustedCatalog = ({
    readCatalog = readHostCatalog,
    timeoutMs = 15000
} = {}) => {
    let pending = null;
    const load = () => {
        if (!pending) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            pending = Promise.resolve()
                .then(() => readCatalog(controller.signal))
                .then(data => {
                    const urls = new Set(parseExtensionCatalog(data).map(entry => entry.url));
                    const digests = new Map();
                    for (const item of data.extensions) {
                        if (typeof item.sha256 === 'string' && SHA256.test(item.sha256)) {
                            digests.set(new URL(item.url).href, item.sha256);
                        }
                    }
                    return {urls, digests, listedDigests: new Set(digests.values())};
                })
                .catch(() => {
                    pending = null;
                    return empty;
                })
                .finally(() => clearTimeout(timer));
        }
        return pending;
    };
    return Object.freeze({
        /**
         * @param {string} url Extension URL from a project.
         * @returns {Promise<boolean>} True for a URL listed in the catalog.
         */
        async isTrustedURL (url) {
            return (await load()).urls.has(url);
        },
        /**
         * @param {object} code Loader code whose bytes were already checked against its SHA-256.
         * @returns {Promise<boolean>} True when the code is the catalog's listed code.
         */
        async isTrustedCode (code) {
            const {urls, digests, listedDigests} = await load();
            if (code.source && code.source.type === 'remote' && urls.has(code.source.url)) {
                const listed = digests.get(code.source.url);
                return !listed || listed === code.actualSHA256;
            }
            return listedDigests.has(code.actualSHA256);
        }
    });
};

export const plusTrustedCatalog = createPlusTrustedCatalog();

/**
 * A distributed single HTML cannot read the catalog (its CSP forbids connections), so the Editor that
 * builds it embeds the listed digests. The recipient trusts only code whose actual bytes match one.
 * @param {string[]} digests SHA-256 digests embedded by the building Editor.
 * @returns {object} Trust checks with the same shape as the catalog's.
 */
export const createDigestTrustedCatalog = (digests = []) => {
    const listed = new Set((Array.isArray(digests) ? digests : []).filter(digest => SHA256.test(digest)));
    return Object.freeze({
        isTrustedURL: () => Promise.resolve(false),
        isTrustedCode: code => Promise.resolve(listed.has(code.actualSHA256))
    });
};

/**
 * @param {object} catalog Trust checks from createPlusTrustedCatalog.
 * @param {object} manifest Offline package manifest, whose sources are all embedded.
 * @returns {Promise<string[]>} Digests of the manifest's extensions that the catalog lists.
 */
export const listTrustedDigests = async (catalog, manifest) => {
    const listed = [];
    for (const spec of manifest.extensions) {
        if (await catalog.isTrustedCode({source: spec.source, actualSHA256: spec.sha256})) listed.push(spec.sha256);
    }
    return [...new Set(listed)];
};
