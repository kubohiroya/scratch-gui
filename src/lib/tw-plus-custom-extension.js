import {LoaderError, validateManifest} from '@kubohiroya/turbowarp-extension-loader';
import {createProjectIO} from '@kubohiroya/turbowarp-extension-loader/project-codec';
import {prepareExtensionAddition} from '@kubohiroya/turbowarp-extension-loader/project-authoring';
import {prepareCatalogExtensionChanges} from '@kubohiroya/turbowarp-extension-loader/project-catalog';

/**
 * Prepare every source and approval before changing the active project.
 * @param {Uint8Array|ArrayBuffer} input The active project's SB3 snapshot.
 * @param {Array<object>} requests Custom sources and requested settings.
 * @param {object} ports The host-owned fetch and trust ports.
 * @param {object} options The archive implementation, limits and abort signal.
 * @returns {Promise<object>} One fully approved project candidate.
 */
export const prepareCustomExtensionAdditions = async (input, requests, ports, options) => {
    const {zip: Zip, signal, loaderOptions} = options;
    if (!Array.isArray(requests) || !requests.length) {
        throw new LoaderError('INVALID_ADDITION', 'Choose at least one custom extension');
    }
    const drafts = requests.map(request => ({id: request.id,
        execution: request.execution,
        source: request.url ? {type: 'remote', url: request.url} :
            {type: 'embedded', path: `extensions/${request.id}.js`},
        sha256: '0'.repeat(64)}));
    validateManifest({schemaVersion: 1, extensions: drafts}, loaderOptions);
    for (const request of requests) {
        if (!['embedded', 'remote'].includes(request.distribution) ||
            (request.distribution === 'remote' && !request.url) || (request.url && request.bytes)) {
            throw new LoaderError('INVALID_ADDITION', 'Invalid custom extension source');
        }
    }
    // The archive codec bounds and validates the input before JSZip reads its project metadata.
    const io = createProjectIO({zip: Zip});
    const checked = await io.prepare(input, {signal});
    const archive = await Zip.loadAsync(checked.input);
    const project = JSON.parse(io.restoreJSON(await archive.file('project.json').async('string'), checked.context));
    const existing = new Set([...(project.extensions || []), ...Object.keys(project.extensionURLs || {}),
        ...(checked.manifest?.extensions || []).map(spec => spec.id)]);
    for (const request of requests) {
        if (existing.has(request.id)) {
            throw new LoaderError('DUPLICATE_EXTENSION',
                'This extension ID already belongs to the project', request.id);
        }
    }
    let candidate = input;
    let prepared;
    for (const request of requests) {
        if (request.url && request.distribution === 'embedded') {
            prepared = await prepareCatalogExtensionChanges(candidate, [{id: request.id,
                url: request.url,
                distribution: 'embedded',
                execution: request.execution}], ports, options);
        } else {
            prepared = await prepareExtensionAddition(candidate, {id: request.id,
                execution: request.execution,
                source: request.url ? {type: 'remote', url: request.url} : {type: 'embedded'},
                ...(request.url ? {} : {bytes: request.bytes})}, ports, options);
        }
        candidate = prepared.projectBytes;
    }
    return {projectBytes: candidate, manifest: prepared.manifest};
};
