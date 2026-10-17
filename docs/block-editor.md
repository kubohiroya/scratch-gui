# 拡張ブロック編集の接続と受け入れ確認

対象: [scratch-gui #1](https://github.com/kubohiroya/scratch-gui/issues/1)、依存: [共通 API #1](https://github.com/kubohiroya/turbowarp-block-editor/issues/1)。
基盤はPR #3で`develop`へ、YAML互換はPR #5で`feat/site/github-pages`へ統合しました。
本受け入れ修正のブランチは`fix/editor/issue-1-acceptance`、基点はサイト用ブランチの`be1183a90`です。
通常CIとPagesの共通API固定参照は、寿命管理修正を含む`21c7cf54df2f2f8768219252a2bc6e5b5ad5434f`へ更新しています。
ローカル受け入れ結果と公開状態は[検証記録](block-editor-acceptance.md)を参照してください。

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
RJSF と YAML codec の browser JS を Babel 変換し、GUI と React を共有します。pnpm のリンク依存を解決するため symlink を実体へ解決します。

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
- 通常の text shadow に保存された JSON/YAML 文字列を編集。reporter、メニュー、独自 validator は変更対象外。
- 開いている間は元ブロックを変更しない。保存時は revision / target / 引数の一致を再確認。
- 保存は Blockly のイベント経路で画面と VM を同期し、Undo/Redo 各1回。適用途中の失敗は値と履歴を復元。
- Schema に違反する入力は保存できない。キャンセルは dirty と履歴を変更しない。
- フラグ OFF の通常操作で登録 API、入口、モーダルを作らない。

`.sb3` の実保存・標準 `project_url` 経路での再読込を確認済みです。[検証ログ](block-editor-sb3-validation.md) を参照してください。
既存アイコンだけを入口とする初版です。アイコンなしのブロックへホストのアイコンを追加する機能は含めません。
代表的な明色/暗色、日本語/英語、倍率60%/100%/150%とproductionビルドを確認しています。
OSのネイティブpicker、全テーマ・全言語・全対応環境の組合せはリリース前検証と区別します。APIは実験的v1のままです。

## 限定検証とロールバック

```sh
npm run test:block-editor
```

実 ScratchBlocks / VM で適用・復元・Undo/Redo、実 ReactModal でポータルと保存状態、登録 API のスキーマ検証を確認します。
共通パッケージのテストでは RJSF の実入力と初期値、必須・型・範囲、非同期追加検証も確認します。
手動では上の URL で invalid 時の無効化、valid の保存、Cancel、Undo/Redo を確認します。
フラグを外した URL では入口が増えないことを確認します。

ロールバックは `blockEditorDialogs=1` を URL から外して再読込します。保存済み JSON/YAML 文字列は通常のブロック引数として残ります。
フラグを既定 ON に変更する前に `.sb3` と対応環境の回帰検証が必要です。

## upstream更新時の確認点

1. `tw-block-editor-bridge.js`の入口は、既知のブロックの先頭`FieldImage`と`fieldGroup_`だけを扱います。`inputList`、`isEditable()`、flyout/read-onlyの判定、SVGのフォーカス・pointer captureが維持されるか確認してください。アイコン以外のドラッグとクリック実行を両方試します。
2. `tw-block-editor-host.js`は通常の`text` shadowと標準`FieldTextInput`だけを更新します。validator、reporter、メニューへの接続、未反映のBlocklyイベントを受け入れないことを維持します。
3. `workspace.fireChangeListener`からVMの通常イベント経路へ通知する前提と、`Events.getGroup()`・`recordUndo`・`undoStack_`・`redoStack_`を確認します。非同期検証中に共有イベントグループを開きません。複数引数の保存とsetter/listener途中失敗のテストで、値・VM・dirty・Undo/Redoの復元を確認します。
4. target、block、shadow、field、VM blockの同一性とrevisionを保存直前に照合します。別作品の読込、target切替、削除、登録解除、遅い検証結果を組み合わせて確認します。ホスト自身の同期transaction中は外部変更による無効化と区別し、適用失敗時の下書きを保持します。
5. GUIのReact/ReactDOMを共通フォームと共有し、ReactModalのportal生成後に入力へフォーカスを移します。Cancel/Escape/閉じる/背景クリック、フォーカス復帰、Tab、composition中のEnter/Escapeと通常の複数行入力を確認します。本文とエラーだけがスクロールし、フッターへ到達できることも確認します。
6. React全体の更新や新しいBlockly APIを前提にしません。共通API更新時は通常CIとPagesの固定SHAをそろえ、RJSF/YAMLのBabel変換、登録境界、型検査・ビルド・対象結合テストを確認します。未公開の`0.0.0`や`apiVersion: 1`だけを対応版の識別子にしません。
7. 明色/暗色、日英、代表倍率で、編集アイコン・通常操作・エラー・保存中表示を確認します。起動時固定フラグの正本は`src/lib/tw-feature-flags.js`です。既定OFFを維持し、OFFの別ページで保存済み作品の値と通常実行を確認します。

## 実行中の保存

モーダルは作品を停止せず、下書きを実行へ反映しません。インタープリタでは保存とUndo/Redoの確定値を実行中に読み取れます。
TurboWarpのコンパイラ有効時は、通常の引数編集と同様、既に走っているコンパイル済みスクリプトが開始時の値を使い続ける場合があります。次の実行で確定値を使うことを比較確認しています。専用エディターからスクリプトを自動で停止・再起動しません。

対象を無効化したときに非同期検証が残っていても、ホストのsnapshot照合でcommitを拒否します。通常終了とは区別し、検証が解決した時点で古いセッション・ビューを解放します。非同期検証は呼び出し側が完了するPromiseを返す契約です。
