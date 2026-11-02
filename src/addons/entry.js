import AddonHooks from './hooks';

const runAddons = () => {
    AddonHooks.startupAwaitedAddonsReady = import(/* webpackChunkName: "addons" */ './api')
        .then(api => api.startupAwaitedAddonsReady);
    // Keep startup failure observable to the fixed host without an unhandled rejection when its flag is OFF.
    AddonHooks.startupAwaitedAddonsReady.catch(error => {
        // eslint-disable-next-line no-console
        console.error(error);
    });
};

export default runAddons;
