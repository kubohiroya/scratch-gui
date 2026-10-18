// Capability exposure is fixed by the host at startup; legacy registration stays available.
const exposeBlockEditorAPI = (api, sourceForms, fixedInputs = false) => {
    const visible = {...api};
    let changed = false;
    for (const [key, enabled] of [['registerSourceEditor', sourceForms], ['registerFixedInputEditor', fixedInputs]]) {
        if ((!enabled || typeof visible[key] !== 'function') && key in api) {
            delete visible[key];
            changed = true;
        }
    }
    return changed ? Object.freeze(visible) : api;
};

export default exposeBlockEditorAPI;
