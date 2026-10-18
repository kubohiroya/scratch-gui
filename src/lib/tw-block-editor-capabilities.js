// Capability exposure is fixed by the host at startup; legacy registration stays available.
const exposeBlockEditorAPI = (api, sourceForms) => {
    if (sourceForms && typeof api.registerSourceEditor === 'function') return api;
    const {registerSourceEditor: _sourceEditor, ...legacy} = api;
    return Object.freeze(legacy);
};

export default exposeBlockEditorAPI;
