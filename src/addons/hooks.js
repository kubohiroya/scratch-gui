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

/* global __TW_GUI_HOST__ */
// The distributing build supplies this module; standalone GUI builds have no extra host.
export const getHostIntegration = () =>
    (typeof __TW_GUI_HOST__ === 'undefined' ? null : __TW_GUI_HOST__);
