// Legacy projects can embed large JavaScript bundles in project.json.
// Match the existing per-entry bound without relaxing ZIP, total or code limits.
export const extensionProjectArchiveOptions = Object.freeze({maxProjectBytes: 16 * 1024 * 1024});
