import {createBlockEditorService} from '@kubohiroya/turbowarp-extension-data-editor/rjsf';

import featureFlags from './tw-feature-flags.js';
import exposeBlockEditorAPI from './tw-block-editor-capabilities.js';

const services = new WeakMap();

// The GUI owns VM lifetime; registration and schema policy belong to the shared package.
const getBlockEditorService = vm => {
    if (!services.has(vm)) {
        const service = createBlockEditorService();
        services.set(vm, {...service, api: exposeBlockEditorAPI(service.api, featureFlags.blockEditorSourceForms)});
    }
    return services.get(vm);
};

export default getBlockEditorService;
