# GitHub Pagesの公開運用

公開ソースは `develop`、公開先は https://kubohiroya.github.io/scratch-gui/ 。GitHub公式のartifact型公開を使う。`feat/site/github-pages` へのpushは公開の起点にしない。既存のnpm `gh-pages` と `npm run deploy` は本家由来の別方式で、この公開手順では使わない。

## 初回切替時の設定

workflow変更のdevelopへの取り込みと、次の環境設定をセットで適用する。環境設定はリポジトリ外の状態なので、ファイルを変更しただけでは切り替わらない。

1. Settings → PagesのSourceはGitHub Actionsを維持する。
2. Settings → Environments → `github-pages` → Deployment branches and tagsをSelected branches and tagsにする。許可するのは **branchの `develop` だけ**。`feat/site/github-pages` と、その他のbranch/tagの許可は外す。既存の承認者など他の保護設定は維持する。
3. 旧公開ブランチからの待機runがないことを確認する。旧ブランチの過去のworkflowにも公開設定が残るため、環境側の制限が必要になる。

読み取り確認:

```sh
gh api repos/kubohiroya/scratch-gui/environments/github-pages \
  --jq .deployment_branch_policy
gh api repos/kubohiroya/scratch-gui/environments/github-pages/deployment-branch-policies \
  --jq '.branch_policies | map({name,type})'
```

期待値は `custom_branch_policies: true` / `protected_branches: false` と、`[{name:"develop",type:"branch"}]`。旧公開ブランチの削除は必須ではなく、未保存作業を失わないよう別途判断する。

## 通常の公開

公開操作の承認を受けた運用者が、対象developのCI成功を確認して実行する。developへのpushだけでは自動公開しない。

```sh
gh workflow run pages.yml --repo kubohiroya/scratch-gui --ref develop
gh run list --repo kubohiroya/scratch-gui --workflow pages.yml --limit 5
```

Actions画面から起動する場合もUse workflow fromでdevelopを選ぶ。任意のSHAや公開用ブランチから起動しない。

- ビルド前に実行イベント・ref・完全SHAと、GitHub APIが返す最新develop SHAを照合する。取得失敗時は公開を止める。
- checkoutとビルド結果のSHAを固定し、Pages環境の待機・承認後、デプロイの直前に同じ照合を行う。途中でdevelopが更新されたrun、古いrunの再実行、成果物SHAの不一致は失敗する。
- 公開runは `github-pages` concurrency groupで直列化する。自動キャンセルは行わない。待機中に古くなったrunもデプロイ直前に拒否する。
- 公開後E2Eにはビルドjobが検証したSHAを渡す。`build-info.json` のGUI/core SHA照合と、専用UI・実sb3往復の既存検証を維持する。

比較時点とGitHub側の配信完了の間のdevelop更新までは原子的に制御できない。その場合は最新developから新しいrunを起動する。ガード導入前の過去のworkflowにはチェックを後付けできないため、導入前のrunは再実行しない。環境のbranch制限は旧公開ブランチを拒否するが、過去のdevelop runのSHAまでは制限しない。

## 拒否された場合と結果の確認

`Start a new run with --ref develop` の場合、古いrunのRe-runではなく通常の公開コマンドで新規起動する。APIエラーの場合も鮮度チェックを外さず、権限・APIの復旧後に新規起動する。

build・deploy・verify-publicの3jobがすべて成功したこと、公開 `build-info.json` のrevisionがそのrunのSHAであることを確認し、Issueへ実行URL・GUI/core SHA・検証結果を記録する。ネイティブOSファイル選択の手順やE2E詳細は[共通側の文書](https://github.com/kubohiroya/turbowarp-extension-data-editor/blob/9e041e5278a1ea70146a76c10732d1401955a12a/docs/block-editor-e2e.md)を参照する。

## 限定検証

```sh
node --test test/unit/pages/pages-source.test.cjs
npm run test:pages
git diff --check
```

ガードのテストは正常系、別イベント/ref、古いSHA、ビルド後のdevelop更新、成果物不一致、API/ネットワーク失敗、CLIの終了コードと出力を検証する。実際のActions・環境ポリシー・公開後E2Eは、develop取り込みと公開操作の後に確認する。

## ロールバック

配信内容を戻す場合は、developで問題の変更をrevertした新しいコミットを作り、その最新developを公開する。過去runの再実行でガードを迂回しない。ガード自体を戻す場合は本変更をrevertし、環境ポリシーを戻す必要性を別途確認する。エディターの起動時固定フラグ既定OFFと保存形式は変わらない。
