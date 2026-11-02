/**
 * Where the distributing host plugs its own integration in.
 *
 * This fork should hold no dependency on the TurboWarp-Plus family: the two files that carry
 * dependencies, `package.json` and `package-lock.json`, are the two that both upstream and this
 * fork change, so they conflict on every merge from upstream. The family's own packages belong to
 * turbowarp-plus-editor, which distributes them; this fork keeps the socket and the hook that
 * calls it, and nothing else.
 *
 * So this module is empty on purpose. A host replaces it when it builds the bundle, by aliasing
 * this path to its own integration module. Replacing a module rather than reading a global is
 * deliberate: a global would have to be set before the GUI mounts, which makes the wiring depend
 * on load order, while an alias is resolved when the bundle is built.
 *
 * Returning nothing is what the GUI does on its own, and the hooks that consult this fall back to
 * what they do today. Each feature moves across this boundary one at a time, so at every point
 * the GUI still runs with nothing supplied.
 * @returns {object|null} The host's integration, or null when it supplied none.
 */
export const plusIntegration = () => null;
