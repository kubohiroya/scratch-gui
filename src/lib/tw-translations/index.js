import twTranslations from './generated-translations.json';
import {hostIntegration, hostTranslationsFor} from '../tw-plus-integration-points.js';

const addAdditionalTranslations = editorMessages => {
    for (const locale of Object.keys(editorMessages)) {
        const toMixIn = twTranslations[locale.toLowerCase()];
        if (toMixIn) {
            Object.assign(editorMessages[locale], toMixIn);
        }
        Object.assign(editorMessages[locale], hostTranslationsFor(locale, hostIntegration()));
    }

    // We reuse our `es` translations for `es-419` instead of maintaining separate translations.
    Object.assign(editorMessages['es-419'], twTranslations.es);
};

export default addAdditionalTranslations;
