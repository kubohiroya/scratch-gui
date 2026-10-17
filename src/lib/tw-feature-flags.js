const readFeatureFlags = search => Object.freeze({
    blockEditorDialogs: new URLSearchParams(search).get('blockEditorDialogs') === '1'
});

// Read once at startup; toggling requires a page reload.
const featureFlags = readFeatureFlags(typeof window === 'undefined' ? '' : window.location.search);

export {readFeatureFlags};
export default featureFlags;
