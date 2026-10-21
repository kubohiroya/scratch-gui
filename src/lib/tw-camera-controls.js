const services = new WeakMap();

// The GUI owns one entry; providers own camera state and their actual permission/settings content.
export const createCameraControlsService = () => {
    const providers = new Map();
    const listeners = new Set();
    let sequence = 0;
    let open = false;
    let cameraId = null;
    const notify = () => {
        const ids = Array.from(new Set(Array.from(providers.values()).filter(p => p.visible)
            .map(p => p.cameraId)));
        if (!ids.includes(cameraId)) cameraId = ids[0] || null;
        if (!cameraId) open = false;
        listeners.forEach(listener => listener());
    };
    const snapshot = () => {
        const active = Array.from(providers.values()).filter(p => p.visible);
        const candidates = active.filter(p => p.cameraId === cameraId);
        const provider = candidates.filter(p => p.kind === 'settings' && p.running).pop() ||
            candidates.find(p => p.kind === 'permission') || candidates[candidates.length - 1] || null;
        return {open,
            cameraId,
            cameraIds: Array.from(new Set(active.map(p => p.cameraId))),
            provider: provider ? {...provider} : null};
    };
    const api = Object.freeze({
        registerProvider (options) {
            const {id, kind, element} = options;
            if (typeof id !== 'string' || !id || !['permission', 'settings'].includes(kind) ||
                !element || typeof element !== 'object') throw new TypeError('Invalid camera control provider');
            const provider = {...options,
                token: ++sequence,
                cameraId: options.cameraId || 'default',
                visible: options.visible !== false,
                running: options.running === true};
            providers.set(id, provider);
            notify();
            return Object.freeze({
                update (state) {
                    if (providers.get(id) !== provider) return;
                    let changed = false;
                    for (const key of ['visible', 'running']) {
                        if (typeof state[key] === 'boolean' && state[key] !== provider[key]) {
                            provider[key] = state[key];
                            changed = true;
                        }
                    }
                    if (changed) notify();
                },
                dispose () {
                    if (providers.get(id) !== provider) return;
                    providers.delete(id);
                    notify();
                }
            });
        }
    });
    return {api,
        snapshot,
        subscribe (listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        toggle () {
            open = !open; notify();
        },
        close () {
            open = false; notify();
        },
        select (id) {
            cameraId = id; notify();
        },
        clear () {
            providers.clear(); open = false; notify();
        }
    };
};

const getCameraControls = vm => {
    if (!services.has(vm)) {
        const service = createCameraControlsService();
        vm.on('PROJECT_LOADED', service.clear);
        services.set(vm, service);
    }
    return services.get(vm);
};
export default getCameraControls;
