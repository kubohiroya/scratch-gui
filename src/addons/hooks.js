const AddonHooks = {
    appStateReducer: () => {},
    appStateStore: null,
    blockly: null,
    blocklyWorkspace: null,
    blocklyCallbacks: [],
    startupFieldPatchesReady: Promise.resolve(),
    recolorCallbacks: []
};

export default AddonHooks;
