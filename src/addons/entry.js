import AddonHooks from './hooks';

const runAddons = () => {
    AddonHooks.startupFieldPatchesReady = import(/* webpackChunkName: "addons" */ './api')
        .then(api => api.startupFieldPatchesReady);
    // Keep startup failure observable to the fixed host without an unhandled rejection when its flag is OFF.
    AddonHooks.startupFieldPatchesReady.catch(error => {
        // eslint-disable-next-line no-console
        console.error(error);
    });
};

export default runAddons;
