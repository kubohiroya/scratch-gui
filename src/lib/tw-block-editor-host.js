import {BlockEditorConflictError} from '@kubohiroya/turbowarp-block-editor';

const owns = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

// Adapt only standard, unvalidated text shadows; never evaluate connected reporters.
const createBlockEditorHost = ({ScratchBlocks, workspace, vm, registry, onError = console.error}) => {
    let disposed = false;
    let revision = 0;
    let identity = 0;
    const identities = new WeakMap();
    const identify = object => {
        if (!identities.has(object)) identities.set(object, ++identity);
        return identities.get(object);
    };
    const invalidate = event => {
        if (!event || !event.isUiEvent) revision++;
    };
    workspace.addChangeListener(invalidate);
    vm.on('workspaceUpdate', invalidate);
    vm.on('targetsUpdate', invalidate);

    const inspect = reference => {
        const target = vm.editingTarget;
        if (disposed || !target || target.id !== reference.targetId || workspace.isFlyout ||
            workspace.options.readOnly || (workspace.isDragging && workspace.isDragging())) return null;
        const block = workspace.getBlockById(reference.blockId);
        if (!block || block.isInFlyout || block.isShadow() || !block.isEditable()) return null;
        const descriptor = registry.resolve(block.type);
        const vmBlock = target.blocks.getBlock(block.id);
        if (!descriptor || !vmBlock || vmBlock.opcode !== block.type) return null;
        const slots = {};
        const fields = new Map();
        const signature = [revision, identify(block), identify(vmBlock), identify(target)];
        for (const name of descriptor.editableArguments) {
            const input = block.getInput(name);
            const shadow = input && input.connection && input.connection.targetBlock();
            const field = shadow && shadow.getField('TEXT');
            const vmShadow = shadow && target.blocks.getBlock(shadow.id);
            const vmInput = vmBlock.inputs && vmBlock.inputs[name];
            // Plain text is the only field family whose validation/side effects we support here.
            if (!shadow || !shadow.isShadow() || shadow.type !== 'text' || !field ||
                field.constructor !== ScratchBlocks.FieldTextInput || field.getValidator() ||
                !vmShadow || vmShadow.opcode !== 'text' || !vmShadow.fields.TEXT ||
                !vmInput || vmInput.block !== shadow.id || typeof field.getValue() !== 'string') {
                Object.defineProperty(slots, name, {value: {kind: 'reporter'}, enumerable: true});
                continue;
            }
            // Do not open or save against events which have not reached the VM yet.
            if (vmShadow.fields.TEXT.value !== field.getValue()) return null;
            Object.defineProperty(slots, name, {
                value: {kind: 'literal', value: field.getValue()}, enumerable: true
            });
            fields.set(name, {shadow, field, value: field.getValue()});
            signature.push(name, identify(shadow), identify(field), identify(vmShadow), shadow.id);
        }
        return {
            snapshot: {
                targetId: target.id,
                blockId: block.id,
                opcode: block.type,
                revision: JSON.stringify(signature),
                arguments: slots
            },
            fields
        };
    };

    const commit = ({expected, changes}) => {
        const current = inspect(expected);
        if (!current || JSON.stringify(current.snapshot) !== JSON.stringify(expected)) {
            throw new BlockEditorConflictError();
        }
        const Events = ScratchBlocks.Events;
        if (!Events.isEnabled() || !Events.recordUndo || Events.getGroup() ||
            !Array.isArray(workspace.undoStack_) || !Array.isArray(workspace.redoStack_)) {
            throw new Error('The workspace is busy or its undo API is unsupported.');
        }
        const seen = new Set();
        const prepared = changes.map(change => {
            if (!change || typeof change.value !== 'string' || seen.has(change.argument) ||
                !owns(expected.arguments, change.argument) || !current.fields.has(change.argument)) {
                throw new TypeError('Only distinct standard text shadow changes are supported.');
            }
            seen.add(change.argument);
            const item = current.fields.get(change.argument);
            return {...item, next: change.value};
        }).filter(item => item.next !== item.value);
        if (!prepared.length) return;

        const undo = workspace.undoStack_.slice();
        const redo = workspace.redoStack_.slice();
        const emitProjectChanged = vm.runtime.emitProjectChanged;
        let succeeded = false;
        // Hold dirty notifications until all synchronous field/VM updates have succeeded.
        vm.runtime.emitProjectChanged = () => {};
        Events.setGroup(true);
        Events.disable();
        try {
            for (const item of prepared) {
                item.field.setValue(item.next);
                if (item.field.getValue() !== item.next) throw new Error('The field rejected its value.');
            }
            // Deliver normal Change events synchronously: VM and undo state agree before resolving.
            for (const item of prepared) {
                workspace.fireChangeListener(new Events.Change(item.shadow, 'field', 'TEXT', item.value, item.next));
            }
            succeeded = true;
        } catch (error) {
            // No queued setter events exist because events were disabled throughout this section.
            for (const item of prepared) {
                item.field.setValue(item.value);
                vm.blockListener(new Events.Change(item.shadow, 'field', 'TEXT', item.next, item.value));
            }
            workspace.undoStack_.splice(0, workspace.undoStack_.length, ...undo);
            workspace.redoStack_.splice(0, workspace.redoStack_.length, ...redo);
            throw error;
        } finally {
            Events.enable();
            Events.setGroup(false);
            vm.runtime.emitProjectChanged = emitProjectChanged;
        }
        if (succeeded) {
            // Observer exceptions must not misreport an already committed transaction as rejected.
            try {
                emitProjectChanged.call(vm.runtime);
            } catch (error) {
                onError(error);
            }
        }
    };

    return {
        readBlock: reference => {
            const result = inspect(reference);
            return result ? result.snapshot : null;
        },
        commit,
        invalidate: () => invalidate(),
        dispose: () => {
            disposed = true;
            workspace.removeChangeListener(invalidate);
            vm.removeListener('workspaceUpdate', invalidate);
            vm.removeListener('targetsUpdate', invalidate);
        }
    };
};

export default createBlockEditorHost;
