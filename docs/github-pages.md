# GitHub Pages 公開

対象: [Issue #4](https://github.com/kubohiroya/scratch-gui/issues/4)。
公開ソースは `feat/site/github-pages`。既存の GUI 実装 branch を起点とし、`develop` とドラフト PR #3 の merge は含めません。

## 公開物

- 入口: `https://kubohiroya.github.io/scratch-gui/`
- 日本語: `/scratch-gui/ja/`、英語: `/scratch-gui/en/`
- 拡張版: `/scratch-gui/editor.html?blockEditorDialogs=1`
- 通常版: `/scratch-gui/editor.html`。機能フラグの既定 OFF は維持。
- `build-info.json` に GUI と共通 API のリポジトリ・完全 SHA を記録。公開ソースへのリンクと GPL の LICENSE を同梱。

GitHub Pages は静的配信であり、HTTP Accept-Language をサーバーで交渉する機能は使いません。
入口の JS は保存した手動選択、navigator.languages の優先順、英語フォールバックの順で日英を選びます。
各言語は HTML の実体を持ち、言語切替リンクと JavaScript 無効時の入口を提供します。
エディターの `lang` は既存の言語設定機構へ渡します。エディターで保存した言語設定は上流の優先順位に従います。

サンプルは案内ページで同梱のコードをコピーし、カスタム拡張の「テキスト」へ貼り付け、サンドボックスなしで実行することをユーザーが選択します。
URL の直接読込は上流が未信頼URLに sandbox を強制するため、このサンプルには使いません。コピーできない環境ではソースのテキスト欄を表示します。
セキュリティマネージャーの信頼するURLや権限確認は変更しません。

## ビルドと依存

共通 API は `5e8b76d2834be2d699737b6c8b4a0a9990796f92` に固定。
Actions は両リポジトリを隣接配置し、共通 API を pnpm 11.18.0 と Node 22 で install / typecheck / test / build します。
GUI は npm ci、既存のアセット生成、限定テストの後に `npm run build:pages` を実行します。

```sh
ROOT=/scratch-gui/ npm run build:pages
```

このコマンドは生成物 `build/` を作り直し、production のアプリだけをビルドします。UMD ライブラリ配布物 `dist/` は公開しません。
通常プレイヤーは `player.html` に残し、`index.html` は日英振り分けの入口です。
`site/` の日英文面と共通CSS、`scripts/generate-pages.mjs` が案内HTMLを生成します。
Node の旧 OpenSSL 互換設定はビルドスクリプト内で webpack 4 に限定して渡します。

## 検証と公開

`npm run test:pages` で優先言語・保存選択・フォールバック、日英 HTML のクレジット、ソース SHA、フラグ opt-in / 通常版のリンクとサブパスを確認します。
`npm run test:block-editor` と共通 API テストを実行し、公開URLでもモーダル・検証・保存・キャンセルを確認します。
サブパスで確認するときは、親ディレクトリに `scratch-gui` として build を置き、静的HTTPサーバーで配信します。

`.github/workflows/pages.yml` は公開ソース branch の push と手動実行を入口にします。
GitHub Pages の配信元は GitHub Actions。公開 job だけが `pages: write` と `id-token: write` を持ちます。
検証対象は今回の公開経路と変更部分です。この公開は実験版で、安定版リリースのフル検証を完了したものではありません。

## ロールバック

公開物の切戻しは、公開ソースの直前の正常コミットへ戻すコミットを作り、同じ workflow で再デプロイします。
公開を取り消す場合は GitHub Pages の unpublish を実施します。
拡張 UI だけを外す場合は `blockEditorDialogs=1` なしの通常版を使用します。保存済み JSON は通常引数に残ります。
本番の既定フラグを ON に変更する前には、回帰結果とロールバックを別タスクで確認します。
