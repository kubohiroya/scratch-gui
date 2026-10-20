# 共通フォームを app から使うローカル統合

関連: extension-data-editor #49 / camera-source #52 / kamishibai-app #847。
`package.json` と `package-lock.json` のエディター依存を、
`preview-dependencies.json` に記録したコミットの private な tgz に固定した。
リリース番号は上書き公開しない。通常の npm install / npm ci はローカル tgz を解決する。

`blockEditorDialogs=1&blockEditorSourceForms=1&blockEditorCommonLayout=1` を起動 URL に指定すると、
共通フォームのレイアウトと固定 Schema 入力を有効にする。
フラグは起動時に一度だけ読み取り、既定 OFF。
共通フォームのモーダル幅は最大 820px、狭い画面では viewport に収める。
フラグを外して再読込すれば従来表示へ戻る。保存するブロックのデータ形式は変更しない。

実 app への接続は kamishibai-app の `scripts/preview/common-form-app.mjs` で行う。
そのビルドでは camera-source の新しいランタイムを app の静的バンドルに含め、
編集登録の opcode もバンドル後の namespace に合わせる。

受け入れ確認:

- [x] 既定 OFF / ダイアログフラグとの依存 / 起動時固定のテスト。
- [x] 関連単体テスト 72 件。
- [x] 全ワーカーを含む実 GUI ビルド。
- [x] 実 app のブロックからフォームを開く。
- [x] 不正値は保存不可、正常値の保存・再表示・Cancel・SB3 シリアライズを確認。

公開用 npm リリースへの切り替え、push、デプロイは別工程。
