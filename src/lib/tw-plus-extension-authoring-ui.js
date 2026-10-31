/* global globalThis */
import {getExtensionAuthoringHost} from './tw-plus-extension-authoring.js';

const dialogs = new WeakMap();
const element = (document, tag, value, attributes = {}) => {
    const node = document.createElement(tag);
    if (value) node.textContent = value;
    for (const [key, item] of Object.entries(attributes)) node.setAttribute(key, item);
    return node;
};

/**
 * Collect user input; hashing, source validation and project encoding belong to the Loader.
 * @param {object} vm The VM owned by the active host.
 * @returns {HTMLDialogElement|null} The authoring dialog, when the host is enabled.
 */
export const openPlusExtensionAuthoring = (vm, {document = globalThis.document, locale = 'ja'} = {}) => {
    const authoring = getExtensionAuthoringHost(vm);
    if (!authoring || !document?.body) return null;
    if (dialogs.has(vm)) return dialogs.get(vm);
    const ja = locale.startsWith('ja');
    const text = (japanese, english) => (ja ? japanese : english);
    const dialog = element(document, 'dialog', '', {
        'class': 'tw-plus-permission',
        'data-testid': 'tw-plus-authoring',
        'aria-label': text('Plus拡張を追加', 'Add Plus extension')
    });
    dialog.appendChild(element(document, 'h2', text('Plus拡張を追加', 'Add Plus extension')));
    dialog.appendChild(element(document, 'p', text(
        'JSファイルを作品に同梱するか、HTTPSのURLから取得します。内容を検証し、実行を許可した後に作品へ追加します。',
        'Embed a JavaScript file in the project, or fetch it from an HTTPS URL. ' +
        'The extension is added after verification and your execution approval.')));
    const form = document.createElement('form');
    const field = (label, control) => {
        const wrapper = document.createElement('label');
        wrapper.style.cssText = 'display:block;margin:14px 0';
        wrapper.appendChild(element(document, 'span', label));
        control.style.cssText =
            'display:block;box-sizing:border-box;width:100%;margin-top:5px;font:inherit;padding:8px';
        wrapper.appendChild(control);
        form.appendChild(wrapper);
        return wrapper;
    };
    const mode = element(document, 'select', '', {'data-testid': 'tw-plus-authoring-mode'});
    mode.appendChild(element(document, 'option',
        text('Embedded — JSを作品に同梱', 'Embedded — include JS in the project'), {value: 'embedded'}));
    mode.appendChild(element(document, 'option',
        text('Remote — HTTPS URLから取得', 'Remote — fetch from an HTTPS URL'), {value: 'remote'}));
    field(text('配布方式', 'Distribution'), mode);
    const id = element(document, 'input', '', {'type': 'text',
        'required': '',
        'autocomplete': 'off',
        'data-testid': 'tw-plus-authoring-id',
        'placeholder': 'myextension'});
    field(text('拡張ID（JSのgetInfo().idと同じ値）', 'Extension ID (the value of getInfo().id in your JS)'), id);
    const file = element(document, 'input', '', {'type': 'file',
        'accept': '.js,text/javascript,application/javascript',
        'data-testid': 'tw-plus-authoring-file'});
    const fileField = field(text('JSファイル', 'JavaScript file'), file);
    const url = element(document, 'input', '', {'type': 'url',
        'autocomplete': 'off',
        'data-testid': 'tw-plus-authoring-url',
        'placeholder': 'https://example.com/extension.js'});
    const urlField = field(text('JSのHTTPS URL', 'JavaScript HTTPS URL'), url);
    const digest = element(document, 'output', '', {'data-testid': 'tw-plus-authoring-sha256'});
    digest.style.cssText = 'display:block;overflow-wrap:anywhere;font:12px/1.5 monospace';
    field(text('SHA-256（自動計算）', 'SHA-256 (calculated automatically)'), digest);
    const status = element(document, 'p', text('追加する拡張を指定してください。', 'Choose the extension to add.'),
        {'role': 'status', 'data-testid': 'tw-plus-authoring-status'});
    form.appendChild(status);
    const menu = document.createElement('menu');
    const cancel = element(document, 'button', text('キャンセル', 'Cancel'),
        {'type': 'button', 'data-testid': 'tw-plus-authoring-cancel'});
    const submit = element(document, 'button', text('検証して追加', 'Verify and add'),
        {'type': 'submit', 'data-testid': 'tw-plus-authoring-submit'});
    menu.appendChild(cancel); menu.appendChild(submit); form.appendChild(menu);
    dialog.appendChild(form);
    let controller;
    let completed = false;
    let closed = false;
    let recoveryURL;
    const close = () => {
        closed = true;
        controller?.abort();
        // The listener is initialized before the dialog can be shown or closed.
        // eslint-disable-next-line no-use-before-define
        unsubscribe?.();
        if (recoveryURL) URL.revokeObjectURL(recoveryURL);
        dialogs.delete(vm);
        dialog.remove();
    };
    const updateMode = () => {
        fileField.hidden = mode.value !== 'embedded';
        urlField.hidden = mode.value !== 'remote';
        fileField.style.display = mode.value === 'embedded' ? 'block' : 'none';
        urlField.style.display = mode.value === 'remote' ? 'block' : 'none';
        file.required = mode.value === 'embedded';
        url.required = mode.value === 'remote';
    };
    updateMode();
    mode.addEventListener('change', updateMode);
    cancel.addEventListener('click', close);
    dialog.addEventListener('cancel', event => {
        event.preventDefault(); close();
    });
    dialog.addEventListener('close', close);
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (controller || completed) return;
        controller = new AbortController();
        for (const input of [mode, id, file, url, submit]) input.disabled = true;
        digest.textContent = '';
        status.textContent = text('JSを取得・検証しています。表示される実行許可を確認してください…',
            'Fetching and verifying JavaScript. Review the execution permission when prompted…');
        try {
            const request = {id: id.value.trim(),
                source: mode.value === 'remote' ?
                    {type: 'remote', url: url.value.trim()} : {type: 'embedded'}};
            if (mode.value === 'embedded') request.bytes = file.files[0];
            const spec = await authoring.add(request, {signal: controller.signal,
                onPrepared: prepared => {
                    digest.textContent = prepared.sha256;
                }});
            if (closed) return;
            digest.textContent = spec.sha256;
            status.textContent = text(`${spec.id}を追加しました。ファイルメニューからSB3保存・パッケージ化ができます。`,
                `Added ${spec.id}. Save the SB3 or package the project from the File menu.`);
            cancel.textContent = text('閉じる', 'Close');
            // The controller guard prevents concurrent submissions; closing cannot reopen this dialog.
            // eslint-disable-next-line require-atomic-updates
            submit.hidden = true;
            // eslint-disable-next-line require-atomic-updates
            completed = true;
        } catch (error) {
            if (closed) return;
            status.textContent = text(`追加できませんでした: ${error.code || ''} ${error.message}`,
                `Could not add extension: ${error.code || ''} ${error.message}`);
            if (error.originalProject) {
                recoveryURL = URL.createObjectURL(new Blob([error.originalProject],
                    {type: 'application/x.scratch.sb3'}));
                const recovery = element(document, 'a', text('追加前のSB3を保存', 'Save the original SB3'),
                    {'href': recoveryURL,
                        'download': 'before-extension-addition.sb3',
                        'data-testid': 'tw-plus-authoring-recovery'});
                status.appendChild(document.createElement('br'));
                status.appendChild(recovery);
            }
        } finally {
            // No other handler can replace this guarded operation while its promise is pending.
            // eslint-disable-next-line require-atomic-updates
            controller = null;
            if (!completed) for (const input of [mode, id, file, url, submit]) input.disabled = false;
        }
    });
    document.body.appendChild(dialog);
    dialogs.set(vm, dialog);
    const unsubscribe = authoring.onDispose?.(close);
    try {
        dialog.showModal(); id.focus();
    } catch (error) {
        close(); return null;
    }
    return dialog;
};
