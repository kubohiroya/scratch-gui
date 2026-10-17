# 拡張ブロック編集の最小接続

対象: [scratch-gui #1](https://github.com/kubohiroya/scratch-gui/issues/1)、依存: [共通 API #1](https://github.com/kubohiroya/turbowarp-block-editor/issues/1)。
ブランチは `feat/editor/block-dialog-bridge`、共通 API は `feat/editor/session-contract`。小さな PR に分割し、通常は Squash & Merge とします。

## 起動

Node.js 22.18 以降を使い、両リポジトリを同じ親ディレクトリへ置きます。
共通 API を先に `pnpm install`、`pnpm build` でビルドします。
GUI のローカル依存は `file:../turbowarp-block-editor` で、未公開パッケージです。

```sh
npm ci --ignore-scripts --no-audit --no-fund
node scripts/prepublish.mjs
CI=1 NODE_OPTIONS=--openssl-legacy-provider PORT=8000 npm start -- --host 127.0.0.1
```

`prepublish.mjs` は既存の micro:bit アセット生成です。レジストリへの公開は行いません。
webpack 4 のため Node の OpenSSL 互換設定が必要です。
RJSF のみ Babel 変換し、GUI と React を共有します。pnpm のリンク依存を解決するため symlink を実体へ解決します。

次の URL でサンプルを読み込み、カテゴリ「Block editor demo」のブロックを配置します。
配置済みブロックのアイコンをクリックすると、label / duration のフォームが開きます。

<http://localhost:8000/editor.html?blockEditorDialogs=1&extension=http%3A%2F%2Flocalhost%3A8000%2Fstatic%2Fextensions%2Fblock-editor.js>

## 拡張作者向け API

unsandboxed 拡張の `Scratch.gui.blockEditors.register()` に `apiVersion: 1`、`extensionId`、`editorId`、完全な `opcodes`、保存先 `argument`、`schema`、任意の `uiSchema` を渡します。
`mount` の指定がなければ RJSF による標準フォームを使います。明示的な `registerSchema()` もあります。
例は `src/examples/extensions/block-editor.js`、共通仕様は隣接パッケージの `docs/api.md` を参照してください。
`uiSchema` は JSON の指定に限定します。独自 widget などの関数を渡す場合は独自 `mount` を実装してください。
Schema が不正な場合や参照を解決できない場合は登録を拒否します。

入力のたびにスキーマを検証し、invalid では Save を無効化します。保存時も再検証してから適用します。
任意の `validateData` は保存時の追加の非同期検証です。その待機中は保存・閉じる・編集を抑止します。
保存成功以外は下書きを保持し、Cancel / Escape / 閉じるは下書きだけ破棄します。

## 適用範囲と受け入れ基準

- 起動時固定フラグは `src/lib/tw-feature-flags.js` の `blockEditorDialogs`。既定 OFF、値 `1` の場合だけ有効。
- 配置済み・編集可能・登録 opcode の既存アイコンだけに入口を付与。クリック、Enter、Space で開く。
- 通常の text shadow に保存された JSON 文字列を編集。reporter、メニュー、独自 validator は変更対象外。
- 開いている間は元ブロックを変更しない。保存時は revision / target / 引数の一致を再確認。
- 保存は Blockly のイベント経路で画面と VM を同期し、Undo/Redo 各1回。適用途中の失敗は値と履歴を復元。
- Schema に違反する入力は保存できない。キャンセルは dirty と履歴を変更しない。
- フラグ OFF の通常操作で登録 API、入口、モーダルを作らない。

`.sb3` の実保存・標準 `project_url` 経路での再読込を確認済みです。[検証ログ](block-editor-sb3-validation.md) を参照してください。
OS picker、アイコンなしのブロックへの入口追加、全テーマと翻訳、production 全体ビルドは後続です。
この段階では初期 API の互換性を固定しません。

## 限定検証とロールバック

```sh
npm run test:block-editor
```

実 ScratchBlocks / VM で適用・復元・Undo/Redo、実 ReactModal でポータルと保存状態、登録 API のスキーマ検証を確認します。
共通パッケージのテストでは RJSF の実入力と初期値、必須・型・範囲、非同期追加検証も確認します。
手動では上の URL で invalid 時の無効化、valid の保存、Cancel、Undo/Redo を確認します。
フラグを外した URL では入口が増えないことを確認します。

ロールバックは `blockEditorDialogs=1` を URL から外して再読込します。保存済み JSON 文字列は通常のブロック引数として残ります。
フラグを既定 ON に変更する前に `.sb3` と対応環境の回帰検証が必要です。
