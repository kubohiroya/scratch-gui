const AddonHooks = {
    appStateReducer: () => {},
    appStateStore: null,
    blockly: null,
    blocklyWorkspace: null,
    blocklyCallbacks: [],
    startupAwaitedAddonsReady: Promise.resolve(),
    recolorCallbacks: []
};

export default AddonHooks;
