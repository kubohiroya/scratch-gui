import {createBlockEditorService} from '@kubohiroya/turbowarp-extension-data-editor/rjsf';

import featureFlags from './tw-feature-flags.js';
import exposeBlockEditorAPI from './tw-block-editor-capabilities.js';

const services = new WeakMap();
const presentation = new WeakMap();

const fixedMessages = intl => ({
    reset: intl.formatMessage({id: 'tw.blockEditor.fixed.reset',
        defaultMessage: 'Reset',
        description: 'Reset one fixed input to its declared reset value'}),
    readOnly: intl.formatMessage({id: 'tw.blockEditor.fixed.readOnly',
        defaultMessage: 'This input cannot be edited safely.',
        description: 'A fixed input is read only'}),
    unverified: intl.formatMessage({id: 'tw.blockEditor.fixed.unverified',
        defaultMessage: 'The expression is retained without evaluation. Its runtime validity has not been checked.',
        description: 'A retained reporter expression is not evaluated by the editor'}),
    currentValue: intl.formatMessage({id: 'tw.blockEditor.fixed.currentValue',
        defaultMessage: 'Current value',
        description: 'The raw captured value of a fixed input'}),
    colorPicker: intl.formatMessage({id: 'tw.blockEditor.fixed.colorPicker',
        defaultMessage: 'color picker',
        description: 'Accessible name of a fixed color picker'}),
    invalidValue: intl.formatMessage({id: 'tw.blockEditor.fixed.invalidValue',
        defaultMessage: 'Check this value before saving.',
        description: 'A fixed input is invalid'}),
    inactiveDraft: intl.formatMessage({id: 'tw.blockEditor.fixed.inactiveDraft',
        defaultMessage: 'Hidden edits are retained in this dialog and will not be saved while hidden.',
        description: 'A hidden fixed input has unsaved edits'})
});

// The GUI owns VM lifetime; registration and schema policy belong to the shared package.
const getBlockEditorService = (vm, intl) => {
    if (intl) presentation.set(vm, intl);
    if (!services.has(vm)) {
        const service = createBlockEditorService({
            commonLayout: featureFlags.blockEditorCommonLayout,
            fixedInputs: featureFlags.blockEditorFixedInputs,
            fixedInputMessages: () => (presentation.has(vm) ? fixedMessages(presentation.get(vm)) : {})
        });
        services.set(vm, {
            ...service,
            api: exposeBlockEditorAPI(service.api,
                featureFlags.blockEditorSourceForms, featureFlags.blockEditorFixedInputs)
        });
    }
    return services.get(vm);
};

export {fixedMessages};
export default getBlockEditorService;
