# 専用エディターのE2E

テスト本体・Playwright/JSZip開発依存・CI手順は [turbowarp-block-editor](https://github.com/kubohiroya/turbowarp-block-editor/blob/main/docs/block-editor-e2e.md) が所有する。GUI側にはビルドと共通CI呼出しのみを残す。

共通リポジトリで `E2E_GUI_ROOT=/absolute/path/scratch-gui pnpm test:e2e:block-editor` を実行する。専用編集・validation・保存/キャンセル・実sb3往復・既定OFFの4件を検証し、証跡を共通側へ保存する。OSネイティブ選択はmacOS専用コマンドで別に検証する。

公開前には共通変更を先に公開し、node.js.yml/pages.ymlの共通checkout refとblock-editor-public.ymlのuses/runner_revisionを、その完全SHAへ揃える。この変更では4箇所を `b8ae85aa889bebecff5fd88b4f344e815cf8430b`（[共通PR #9](https://github.com/kubohiroya/turbowarp-block-editor/pull/9)）へ固定した。共通を先に採用し、Squash Merge後はGUIの参照をそのmerge SHAへ揃える。CIの実行結果はIssue #12 / #15に記録する。Pagesの公開ブランチ更新とデプロイは別途行う。

RollbackはGUIのCI/設定呼出しと共通依存を対で戻す。機能は既定OFF、保存形式は変更しない。関連: #12 / #15 / 共通 #7。
