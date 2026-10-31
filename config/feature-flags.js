/* eslint-env browser */
import {readDocumentEditorFlags} from '@kubohiroya/turbowarp-document-editor';

// Resolve once at GUI startup; project data cannot enable document editing.
const featureFlags = readDocumentEditorFlags(typeof window === 'undefined' ? '' : window.location.search);
export default featureFlags;
