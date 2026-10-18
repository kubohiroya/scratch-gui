# 段階2: Source/FormのGUI接続

対象Issue: https://github.com/kubohiroya/scratch-gui/issues/28

`blockEditorSourceForms` は起動時固定・既定OFFで、`blockEditorDialogs=1` と同時に指定した場合だけ有効です。利用する場合は `?blockEditorDialogs=1&blockEditorSourceForms=1` を付けてGUIを再読込し、信頼した対象拡張をunsandboxedで読み込みます。dialogsのみの場合と両方OFFの場合は既存の登録APIだけを公開します。descendantsのフラグは独立したままです。

対象は共通エディターの `registerSourceEditor` capabilityの公開制御、prepared saveを使う実hostの回帰検証、既存CIでの `test:block-editor` 実行です。GUIに各拡張のSchemaを複製せず、拡張が所有する固定Schemaと検証を使います。Schema自体の編集・実行時Schema・候補管理は別工程です。

## 互換性と検証

- 既存 `register` / `registerSchema` / `registerSchemaBundle` と `apiVersion: 1` を維持します。
- 既存GUIのReact / React DOM 16.14.0を維持します。
- `npm run test:block-editor` の62ケースで、フラグ、旧API、実ScratchBlocks/VM host、複数引数のatomic保存、setter/listener失敗時のrollbackを検証します。
- 新しい対象テストを既存CIのnpm ci/build/test:unitに追加します。既存のテストを置き換えません。

先行する全体659ケースと実GUI代表5ケース×8手順は、ローカルfile artifactに対する保存済み結果です。公開Git SHAへの移行後の結果とは区別し、その履歴を保持します。

## 初回公開Git依存への移行記録（履歴）

共通artifactは [先行PR #32](https://github.com/kubohiroya/turbowarp-extension-data-editor/pull/32) の完全SHA `14e6a8d4d9552dd382021b9c7913a7b295ccf822` に固定しました。`package.json` とnpm lockのroot指定・resolvedが同じSHAを指します。Node 22.16.0 / npm 10.9.2の標準resolverでlockを生成し、common entryとroot spec以外のpackage entryが更新前と一致することを確認しました。React / React DOMのlock・実解決は16.14.0です。

npmが当該Git SHAから取得・prepareしてcacheへ保存したtarballを、lockのSHA-512 integrityで読み出し、ソースを含まない検証先へ展開しました。そのSHA-256は `0d398f93b22383634f0bdcabbe7152fcaae76cc14bdf7b59678099be739b9286`、build-infoのrevisionは上記SHA、source SHA-256は `aef366417f026ececbcb718f8001f3b5dddc5e34a2fdb3bc69d5390ce2e9118e` です。最終検証ではこのpackageを明示的に実解決させています。runtime依存・既存toolingは検証用環境の既存解決を使っており、全GUI toolingを新規npm ciで再インストールした結果とは区別します。

移行後の対象テストは62件成功しました。既存webpack 4設定の最初のbrowser target全6entryもbuild成功（production設定、ローカル検証ではminifyのみOFF）、変更JS限定eslintとdiff whitespace検査も成功しました。CIは既存のnpm ci・標準build・test:unitを維持し、`test:block-editor` を追加しました。CI結果はPR checksを正本とし、上記ローカル結果と区別します。

## ロールバック

`blockEditorSourceForms` をOFFにして再読込します。差分の切戻しが必要な場合は本変更と依存manifest/npm lockを一体でrevertします。拡張のconsumer→producer→共通artifactの逆依存順を守り、既存rawを自動移行しません。本作業ではmerge・npm公開・Pagesの直接変更を実施しません。


## 安定版公開前の最終依存

共通0.2.0のsecurity修正を含むmain SHA `76fa1d50a3c188082ceef723ea018a9d8769ea6e` にmanifestとnpm lockを更新します。共通[security PR #33](https://github.com/kubohiroya/turbowarp-extension-data-editor/pull/33)はdirect fast-uriを3.1.8へ揃えた変更で、共通API・Schemaの正本・owner・保存形式は変更しません。GUI lockでも直接・間接fast-uriを3.1.8へ統一し、不要になった共通配下の3.1.0を削除します。React/React DOM 16.14.0と、それ以外の既存package entryを維持します。

初回のローカルfile artifact・0.1.0 Git artifact・中間4818a4dの検証結果は履歴として保持します。最終配布の検証とは加算・混同しません。最終検証は隔離clone自身でnpm ciを行い、primary依存への再利用symlinkを排除します。最終local検証ではNode22.16.0/npm10.9.2で `npm ci --ignore-scripts` を実行し、1994 packageをclone内へ再インストールしました。既存prepublishを別途実行して公式microbit HEXの組込SHAを検証しました。全runtime依存34edgeのlock版と物理実解決が一致し、common build-infoのversion0.2.0/revision/source hashとGitcache tarballのlock integrity一致を確認しました。62 block-editorテストと33既存addonテストが成功し、全6browser entryのproduction buildもminifyを維持したまま成功しました。最終GitHub CIはPR checksを正本とします。Issue #28は保持し、PRはRefsで参照します。

最終npm Gitcache tarball SHA-256は `e59412b919dc3f88da7e2dd026d93ea6c69d4ddf1e91cc70781ca725f12b1828`、common source SHA-256は `912efc0438710958698527aa5c26a33b0b1c2da280f91d36b048f6f2389a48f0` です。GUI package名は上流の `scratch-gui` を維持し、このforkをnpmへpublishしません。Gitと共通repoのPages配布で扱います。
