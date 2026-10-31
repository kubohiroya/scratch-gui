/**
 * Read the host's extension feature switch without interpreting project data.
 * @param {string} search Startup URL query.
 * @returns {boolean} Enabled by default, with explicit opt-out and legacy opt-in.
 */
export const isExtensionLoaderEnabled = (search = '') => {
    const value = new URLSearchParams(search).get('twPlusExtensionLoader');
    return value === null || value === '1';
};
