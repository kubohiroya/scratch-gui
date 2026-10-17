const readFeatureFlags = search => {
    const query = new URLSearchParams(search);
    const blockEditorDialogs = query.get('blockEditorDialogs') === '1';
    return Object.freeze({
        blockEditorDialogs,
        blockEditorDescendants: blockEditorDialogs && query.get('blockEditorDescendants') === '1'
    });
};

// Read once at startup; toggling requires a page reload.
const featureFlags = readFeatureFlags(typeof window === 'undefined' ? '' : window.location.search);

export {readFeatureFlags};
export default featureFlags;
