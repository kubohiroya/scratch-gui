const readFeatureFlags = search => {
    const query = new URLSearchParams(search);
    const blockEditorDialogs = query.get('blockEditorDialogs') === '1';
    return Object.freeze({
        extensionSecurityBatch: query.get('extensionSecurityBatch') === '1',
        blockEditorDialogs,
        blockEditorFixedInputs: blockEditorDialogs && query.get('blockEditorFixedInputs') === '1',
        blockEditorSourceForms: blockEditorDialogs && query.get('blockEditorSourceForms') === '1',
        blockEditorDescendants: blockEditorDialogs && query.get('blockEditorDescendants') === '1'
    });
};

// Read once at startup; toggling requires a page reload.
const featureFlags = readFeatureFlags(typeof window === 'undefined' ? '' : window.location.search);

export {readFeatureFlags};
export default featureFlags;
