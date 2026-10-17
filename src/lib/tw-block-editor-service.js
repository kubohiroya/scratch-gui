import {EditorRegistry} from '@kubohiroya/turbowarp-block-editor';
import {createSchemaEditor} from '@kubohiroya/turbowarp-block-editor/rjsf';

const services = new WeakMap();

const getBlockEditorService = vm => {
    if (!services.has(vm)) {
        const registry = new EditorRegistry();
        const listeners = new Set();
        const notify = () => {
            for (const listener of [...listeners]) listener();
        };
        const api = Object.freeze({
            apiVersion: 1,
            register: definition => {
                const editor = !definition.mount && Object.prototype.hasOwnProperty.call(definition, 'schema') ?
                    createSchemaEditor(definition) : definition;
                if (typeof editor.mount !== 'function') {
                    throw new TypeError('A block editor must provide mount().');
                }
                const remove = registry.register(editor);
                notify();
                let active = true;
                return () => {
                    if (!active) return;
                    active = false;
                    remove();
                    notify();
                };
            },
            registerSchema: definition => api.register(createSchemaEditor(definition))
        });
        services.set(vm, {
            registry,
            api,
            subscribe: listener => {
                listeners.add(listener);
                return () => listeners.delete(listener);
            }
        });
    }
    return services.get(vm);
};

export default getBlockEditorService;
