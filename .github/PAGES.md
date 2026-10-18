# GitHub Pages publication

Publication uses GitHub Actions from `develop`: pushes publish automatically, and manual runs must select `develop`.
The `github-pages` environment permits only the `develop` branch.

```sh
gh workflow run pages.yml --repo kubohiroya/scratch-gui --ref develop
```

The source guard checks the full workflow/artifact SHA against the current `develop` before building and immediately before deploying. If the run becomes stale, start a new run; do not bypass the guard. The check and deployment are not atomic, and workflows from before the guard was introduced must not be rerun.

See the shared [publication guide](https://github.com/kubohiroya/turbowarp-extension-data-editor/blob/main/docs/github-pages.md) and [E2E guide](https://github.com/kubohiroya/turbowarp-extension-data-editor/blob/main/docs/block-editor-e2e.md) for configuration, verification and rollback. Keep Japanese operational documentation in the shared repository.

## Published E2E validation records

The [2026-10-18 validation record](https://github.com/kubohiroya/turbowarp-extension-data-editor/blob/ef703b2bbe4dcb6b74c0fee9f799db09240c266b/docs/block-editor-e2e.md) documents [Pages run 39092358787](https://github.com/kubohiroya/scratch-gui/actions/runs/39092358787): all six post-deployment cases passed in 53.6 seconds, with no skips, retries or flaky results. The cases cover the existing four save/cancel, real sb3 roundtrip and default-off checks, plus light and dark invalid-field highlighting, correction and preservation of block appearance.

The [evidence archive merged into shared main](https://github.com/kubohiroya/turbowarp-extension-data-editor/blob/8a0906a42abe60b0e83f8635a209bbcf0fbd077b/docs/editor/issue-12-public-validation/README.md) retains the four screenshots and measurement JSON after the Actions artifact expires. These links use full commit SHAs and do not depend on the former evidence branch.

| Theme | Invalid fields | After correction | Measurements |
| --- | --- | --- | --- |
| Light | [Screenshot](https://github.com/kubohiroya/turbowarp-extension-data-editor/blob/8a0906a42abe60b0e83f8635a209bbcf0fbd077b/docs/editor/issue-12-public-validation/light-invalid.png) | [Screenshot](https://github.com/kubohiroya/turbowarp-extension-data-editor/blob/8a0906a42abe60b0e83f8635a209bbcf0fbd077b/docs/editor/issue-12-public-validation/light-valid.png) | [JSON](https://github.com/kubohiroya/turbowarp-extension-data-editor/blob/8a0906a42abe60b0e83f8635a209bbcf0fbd077b/docs/editor/issue-12-public-validation/light-styles.json) |
| Dark | [Screenshot](https://github.com/kubohiroya/turbowarp-extension-data-editor/blob/8a0906a42abe60b0e83f8635a209bbcf0fbd077b/docs/editor/issue-12-public-validation/dark-invalid.png) | [Screenshot](https://github.com/kubohiroya/turbowarp-extension-data-editor/blob/8a0906a42abe60b0e83f8635a209bbcf0fbd077b/docs/editor/issue-12-public-validation/dark-valid.png) | [JSON](https://github.com/kubohiroya/turbowarp-extension-data-editor/blob/8a0906a42abe60b0e83f8635a209bbcf0fbd077b/docs/editor/issue-12-public-validation/dark-styles.json) |

See the archived [six-case summary](https://github.com/kubohiroya/turbowarp-extension-data-editor/blob/8a0906a42abe60b0e83f8635a209bbcf0fbd077b/docs/editor/issue-12-public-validation/summary.json) and [provenance and SHA-256 checksums](https://github.com/kubohiroya/turbowarp-extension-data-editor/blob/8a0906a42abe60b0e83f8635a209bbcf0fbd077b/docs/editor/issue-12-public-validation/provenance.json) for test counts, deployment identity and evidence sources. The record identifies the tested deployment, not the current Pages revision; the product core and E2E runner revisions are recorded separately. [Shared Issue #12](https://github.com/kubohiroya/turbowarp-extension-data-editor/issues/12) tracks the completed rollout and documentation integration.
