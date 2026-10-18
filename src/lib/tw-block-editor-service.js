import {createBlockEditorService} from '@kubohiroya/turbowarp-extension-data-editor/rjsf';

const services = new WeakMap();

// The GUI owns VM lifetime; registration and schema policy belong to the shared package.
const getBlockEditorService = vm => {
    if (!services.has(vm)) services.set(vm, createBlockEditorService());
    return services.get(vm);
};

export default getBlockEditorService;
