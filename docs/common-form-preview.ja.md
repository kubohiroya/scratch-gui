# 共通フォームの公開npm版をappから使う

関連: [共通フォーム #49](https://github.com/kubohiroya/turbowarp-extension-data-editor/issues/49) / [camera-source #52](https://github.com/kubohiroya/turbowarp-camera-source/issues/52) / [app #941](https://github.com/kubohiroya/turbowarp-kamishibai-app/issues/941)。

`package.json`と`package-lock.json`で共通フォームの公開npm版0.3.0へ固定する。
privateなローカルtgzへの依存は除去し、npm ciから同じ配布物を復元する。

起動URLに`blockEditorDialogs=1&blockEditorSourceForms=1&blockEditorCommonLayout=1`を指定すると、
共通レイアウトと固定Schema向け入力を有効にする。フラグは`src/lib/tw-feature-flags.js`で起動時に一度だけ読み取り、既定OFF。
共通フォームのモーダル幅は最大820px、狭い画面ではviewportに収める。
フラグを外して再読込すれば従来表示へ戻る。保存するブロックのデータ形式は変更しない。

Camera SourceはSchemaと軽量な編集メタデータを宣言し、Ajv・汎用YAML・ReactフォームをGUIの共通基盤が所有する。
appはsb3-toolchain0.16.0の`blockEditorRegistrations:true`を使い、bundle後のopcodeへ登録とbindingを変換する。

受け入れ確認は起動時固定・フラグの依存と既定OFFの単体テスト、実GUIビルド、公開appでの編集・保存・Cancel・SB3保存。
公開EditorのGUI/core source pinと実画面の検証結果はapp #941へ記録する。

切戻しはURLのフラグを外して再読込する。依存を戻す場合はpackage.jsonとlockを一組で戻し、公開済み同版は差し替えない。
