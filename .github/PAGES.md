# GitHub Pages publication

Publication uses GitHub Actions from `develop`: pushes publish automatically, and manual runs must select `develop`.
The `github-pages` environment permits only the `develop` branch.

```sh
gh workflow run pages.yml --repo kubohiroya/scratch-gui --ref develop
```

The source guard checks the full workflow/artifact SHA against the current `develop` before building and immediately before deploying. If the run becomes stale, start a new run; do not bypass the guard. The check and deployment are not atomic, and workflows from before the guard was introduced must not be rerun.

See the shared [publication guide](https://github.com/kubohiroya/turbowarp-extension-data-editor/blob/main/docs/github-pages.md) and [E2E guide](https://github.com/kubohiroya/turbowarp-extension-data-editor/blob/main/docs/block-editor-e2e.md) for configuration, verification and rollback. Keep Japanese operational documentation in the shared repository.
