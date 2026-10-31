import {isExtensionLoaderEnabled} from './extension-loader-flag';

// Capture feature flags once at startup. Reload the editor to change them.
const startupParameters = typeof window === 'undefined' ? new URLSearchParams() :
    new URLSearchParams(window.location.search);

export const TURBOWARP_PLUS_LIBRARY_ENABLED = startupParameters.get('twPlusExtensions') === '1';
export const TURBOWARP_PLUS_EXTENSION_LOADER_ENABLED = isExtensionLoaderEnabled(startupParameters.toString());
