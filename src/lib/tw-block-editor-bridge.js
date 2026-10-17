import createBlockEditorHost from './tw-block-editor-host.js';
import bindBlockEditorIcon from './tw-block-editor-icon.js';

const createBlockEditorBridge = ({ScratchBlocks, workspace, vm, service, label, canOpen, onOpen, onError}) => {
    const host = createBlockEditorHost({ScratchBlocks, workspace, vm, registry: service.registry, onError});
    const decorations = new Map();
    let disposed = false;
    let timer = null;
    let activeSession = null;
    const available = block => {
        if (disposed || !vm.editingTarget || !canOpen() || !service.registry.resolve(block.type)) return false;
        const snapshot = host.readBlock({targetId: vm.editingTarget.id, blockId: block.id});
        return snapshot && Object.values(snapshot.arguments).every(slot => slot.kind === 'literal');
    };
    const open = block => {
        if (activeSession && ['editing', 'saving'].includes(activeSession.getState().status)) return;
        try {
            const session = service.registry.open({
                targetId: vm.editingTarget.id, blockId: block.id
            }, host);
            if (session) {
                ScratchBlocks.hideChaff();
                activeSession = session;
                onOpen(session);
            }
        } catch (error) {
            onError(error);
        }
    };
    const refresh = () => {
        if (disposed) return;
        const seen = new Set();
        for (const block of workspace.getAllBlocks(false)) {
            const input = block.inputList[0];
            const field = input && input.fieldRow[0];
            if (!service.registry.resolve(block.type) || !field ||
                !(field instanceof ScratchBlocks.FieldImage) || !field.fieldGroup_ ||
                block.isInFlyout || block.isShadow() || !block.isEditable()) continue;
            seen.add(block.id);
            const old = decorations.get(block.id);
            if (old && old.field === field) continue;
            if (old) old.cleanup();
            const tooltip = field.imageElement_.tooltip;
            field.setTooltip(label);
            const unbind = bindBlockEditorIcon({
                element: field.fieldGroup_,
                label,
                canOpen: () => available(block),
                onOpen: () => open(block)
            });
            decorations.set(block.id, {field,
                cleanup: () => {
                    unbind();
                    if (field.imageElement_) field.imageElement_.tooltip = tooltip;
                }});
        }
        for (const [id, decoration] of decorations) {
            if (!seen.has(id)) {
                decoration.cleanup();
                decorations.delete(id);
            }
        }
    };
    const schedule = () => {
        clearTimeout(timer);
        timer = setTimeout(refresh, 0);
    };
    const unregister = service.subscribe(() => {
        host.invalidate();
        if (activeSession) activeSession.cancel();
        schedule();
    });
    workspace.addChangeListener(schedule);
    vm.on('workspaceUpdate', schedule);
    refresh();
    return {
        refresh,
        dispose: () => {
            disposed = true;
            clearTimeout(timer);
            unregister();
            workspace.removeChangeListener(schedule);
            vm.removeListener('workspaceUpdate', schedule);
            host.dispose();
            if (activeSession) {
                if (!activeSession.dispose()) {
                    const remove = activeSession.subscribe(() => {
                        if (activeSession.getState().status !== 'saving') {
                            remove();
                            activeSession.dispose();
                        }
                    });
                }
            }
            for (const decoration of decorations.values()) decoration.cleanup();
            decorations.clear();
        }
    };
};

export default createBlockEditorBridge;
