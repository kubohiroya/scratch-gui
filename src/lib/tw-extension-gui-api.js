import LazyScratchBlocks from './tw-lazy-scratch-blocks';
import AddonHooks, {getHostIntegration} from '../addons/hooks';

/**
 * Implements Scratch.gui API for unsandboxed extensions.
 * @param {any} Scratch window.Scratch, mutated in place.
 */
const implementGuiAPI = Scratch => {
    Scratch.gui = {
        /**
         * Lazily get the internal ScratchBlocks object when it becomes available. It may never be
         * available if, for example, the user never enters the editor.
         *
         * You should not assume that ScratchBlocks becoming available means the user is actually
         * in the editor or that a workspace has been created already.
         *
         * @returns {Promise<any>} Promise that may eventually resolve to ScratchBlocks
         */
        getBlockly: () => {
            if (AddonHooks.blockly) {
                return Promise.resolve(AddonHooks.blockly);
            }
            return new Promise(resolve => {
                AddonHooks.blocklyCallbacks.push(() => resolve(AddonHooks.blockly));
            });
        },

        /**
         * Get the internal ScratchBlocks object as soon as possible. This lets you access it even
         * if the user never enters the editor.
         *
         * This method is VERY SLOW and will cause A LOT OF CPU AND NETWORK ACTIVITY because it
         * downloads and evaluates all of scratch-blocks, a multi-megabyte JavaScript bundle.
         *
         * @returns {Promise<any>} Promise that will resolve to ScratchBlocks.
         */
        getBlocklyEagerly: () => LazyScratchBlocks.load()
    };
    if (getHostIntegration()?.createPreviewVm) {
        Scratch.gui.createPreviewVm = () => getHostIntegration().createPreviewVm(Scratch.vm.constructor);
    }
    // Left undefined when the host supplied no service, so an extension can tell that this build
    // offers no stage controls rather than calling into a stub that silently does nothing.
    const stage = getHostIntegration()?.hostStageControls?.(Scratch.vm, getHostIntegration()?.hostIntegration?.());
    if (stage) Scratch.gui.stageControls = stage.api;
    const blockEditor = getHostIntegration()?.getBlockEditorService?.(Scratch.vm);
    if (blockEditor) Scratch.gui.blockEditors = blockEditor.api;
};

export default implementGuiAPI;
