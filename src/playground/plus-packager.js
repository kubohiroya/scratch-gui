import JSZip from '@turbowarp/jszip';
import Packager from '@turbowarp/packager-web';
import {createFetchPort} from '@kubohiroya/turbowarp-extension-loader';
import {createProjectIO} from '@kubohiroya/turbowarp-extension-loader/project-codec';
import {prepareOfflinePackage} from '@kubohiroya/turbowarp-extension-loader/packager';
import {createSessionTrustProvider} from '@kubohiroya/turbowarp-extension-loader/session-trust';
import {createPlusPermissionUI} from '../lib/tw-plus-permission-ui.js';
import {packagePlusHTML} from '../lib/tw-plus-packager.js';

const bundledAssets = __TW_PLUS_PACKAGER_ASSETS__;
const bundledRuntime = __TW_PLUS_EXTENSION_RUNTIME__;
const ui = createPlusPermissionUI(document, 'ja');
const status = document.querySelector('[data-testid="plus-package-status"]');
const file = document.querySelector('[data-testid="plus-package-file"]');
const generate = document.querySelector('[data-testid="plus-package-generate"]');
const resources = document.querySelector('[data-testid="plus-package-resources"]');
const download = document.querySelector('[data-testid="plus-package-download"]');
let input;
let title = 'TurboWarp-Plus';
let currentURL;
let pending = false;
const setInput = (bytes, name) => {
    if (pending) return;
    input = bytes;
    title = String(name || 'TurboWarp-Plus').replace(/\.sb3$/i, '');
    status.textContent = `${title}: 外部依存がないことを確認してからHTMLを生成してください。`;
    generate.disabled = false;
    download.hidden = true;
};
file.addEventListener('change', async () => {
    if (!file.files[0] || pending) return;
    try {
        // The core checks Blob.size before reading or inflating the selected file.
        await createProjectIO({zip: JSZip}).prepare(file.files[0]);
        setInput(file.files[0], file.files[0].name);
    } catch (error) {
        input = null;
        generate.disabled = true;
        download.hidden = true;
        status.textContent = `作品を読み込めませんでした: ${error.code || ''} ${error.message}`;
    }
});
window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== window.opener) return;
    const data = event.data && event.data.twPlusPackage;
    if (!data || data.type !== 'project' || !(data.bytes instanceof ArrayBuffer)) return;
    setInput(new Uint8Array(data.bytes), data.name);
});
if (window.opener) window.opener.postMessage({twPlusPackage: {type: 'ready'}}, location.origin);

generate.addEventListener('click', async () => {
    if (!input || pending || !resources.checked) {
        status.textContent = '作品を選び、外部依存がないことを確認してください。';
        return;
    }
    pending = true;
    generate.disabled = true;
    download.hidden = true;
    const trustProvider = createSessionTrustProvider({requestApproval: ui.requestApproval});
    try {
        status.textContent = '作品と拡張のバイト列を検証しています…';
        const io = createProjectIO({zip: JSZip});
        const prepared = await io.prepare(input);
        if (!prepared.manifest) throw new Error('Plus Manifestがありません。通常の作品には標準Packagerを使用してください。');
        const resourceDependencies = Object.fromEntries(prepared.manifest.extensions.map(spec => [spec.id, []]));
        const compiled = await prepareOfflinePackage(input, {
            fetcher: createFetchPort(), trustProvider, diagnostics: ui.diagnostics
        }, {zip: JSZip, resourceDependencies});
        const runtimeBundle = bundledRuntime;
        const packager = new Packager();
        packager.options.app.windowTitle = title;
        const result = await packagePlusHTML(packager, compiled, {runtimeBundle, scaffoldingAssets: bundledAssets});
        if (currentURL) URL.revokeObjectURL(currentURL);
        currentURL = URL.createObjectURL(new Blob([result.data], {type: 'text/html'}));
        download.href = currentURL;
        download.download = `${title}.html`;
        download.hidden = false;
        status.textContent = 'HTMLを生成しました。受け取った人は初回実行時に拡張の許可を確認します。';
    } catch (error) {
        status.textContent = `生成を拒否しました: ${error.code || ''} ${error.message}`;
        ui.diagnostics({type: 'error', code: error.code, message: error.message});
    } finally {
        trustProvider.revokeAll();
        pending = false;
        generate.disabled = false;
    }
});
