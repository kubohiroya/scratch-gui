// Legacy projects can embed large JavaScript bundles in project.json.
// Allow 24 MiB legacy documents while retaining archive, total, ratio and code bounds.
export const extensionProjectArchiveOptions = Object.freeze({
    maxProjectBytes: 32 * 1024 * 1024,
    maxEntryBytes: 32 * 1024 * 1024
});
