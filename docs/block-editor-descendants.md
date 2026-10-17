# 子孫ブロックの一括編集

対象は [scratch-gui Issue #2](https://github.com/kubohiroya/scratch-gui/issues/2)。
共通基盤の [階層セッションAPI](https://github.com/kubohiroya/turbowarp-block-editor/blob/ec338023ca8123b1db50787601ca8c78ab06917d/docs/descendants.md)へ接続します。
通常CIとPages CIは共通基盤SHA `ec338023ca8123b1db50787601ca8c78ab06917d`へ固定します。Pagesの出典表示はビルドした共通基盤の実SHAを使います。

## 起動と切戻し

起動手順は[初版の接続手順](block-editor.md#起動)と同じです。両フラグは起動時固定・既定OFFです。

```text
http://localhost:8000/editor.html?blockEditorDialogs=1&blockEditorDescendants=1
```

拡張機能の読込画面で、ローカルのサンプルURL
`http://localhost:8000/static/extensions/block-editor-descendants.js` を信頼できる拡張としてunsandboxedで読み込みます。
`src/examples/extensions/block-editor-descendants.js` は2枝のgroupとitemを登録します。
groupの内側にitem、専用フォームのない「もし〜なら／でなければ」、その内側のitem、同じ枝の後続itemを配置してください。
根の外側にもitemをつなぎ、条件にはreporterを接続すると探索境界を比較できます。
配置済みgroupの先頭アイコンをクリック、またはフォーカスしてEnter/Spaceで開きます。

`blockEditorDescendants=1` を外して再読込すると初版の単一編集に戻ります。
ホストに `descendant-editing-v1` capabilityがない場合も単一編集へ戻ります。
階層の不正や上限超過は診断を表示し、部分的な単一編集へ切り替えません。
`blockEditorDialogs=1` も外すと専用入口を作りません。保存済み作品のJSON/YAMLと接続はそのまま使えます。

## 範囲と表示

- 根自身とstatement/substackの内側を、入力順・列の順で収集します。列のnextと再帰的な枝を含み、根の外側のnextと値入力のreporterは探索しません。
- 専用フォームのない中間ノードも構造に含め、その先の枝を探索します。値入力の接続は照合し、接続されたreporterを書き換えません。
- 根を深さ0として最大深さ32、構造ノード数500までです。循環・重複接続・上限超過を報告し、切り捨てません。UIとVMの反映待ちや編集不能な構造も部分的に開きません。
- モーダルは1個、フッターは「キャンセル」「すべて保存」の1組です。入力名、列内の順番、ブロックIDを表示して同じopcodeの兄弟を区別します。
- 30ノードまでは展開、31ノード以上では根だけ展開します。折りたたみで本文をunmountしても、下書きと検証は階層セッションに残ります。
- エラーのボタンは祖先を展開し、該当入力へ移動します。未表示のノードも検証し、invalidなら全体の保存を止めます。フォームをHTMLのformとして入れ子にしません。
- 本文をスクロールし、フッターを保持します。IME変換中のEscape/Enterを閉じる操作に渡しません。保存中は入力、展開、閉じる、二重保存を抑止します。

## 保存と寿命

GUIホストは `readSubtree` / `subscribeInvalidation` / `commitSubtree` を提供します。
共通APIの `openDescendants` でセッションを1個だけ開き、各本文には `getEditor` の保存権限を持たないfacadeを渡します。
各ノードのsaveを順番に呼びません。

開いた時点の世代、targetと各ブロック・shadow・field・VMブロックの同一性、引数、構造を保持し、実書込直前にも全範囲を照合します。
値・構造の変更、削除・移動、作品やtargetの切替、対象登録の解除で全体を無効化し、非同期検証の遅い結果を破棄します。
折りたたみは本文だけを解放し、キャンセル・無効化は全セッションと本文を解放します。

変更は標準のvalidatorなしtext shadowに限定し、重複する書込先を拒否します。
全変更を同期transactionで適用し、BlocklyのChangeイベントでVM・キャッシュ・Undoを同期します。
成功時だけdirty通知を1回発行し、変更なしの保存はdirtyと履歴を作りません。
setterやイベント配送の途中失敗は、全フィールド、VM、Undo/Redo、revisionを復元し、下書きを保持して再試行できます。
全変更はUndo/Redo各1回で戻せます。reporterや既存接続に構造変更を加えません。

作品を自動停止せず、下書きを実行へ渡しません。
実行中のコンパイル済みスクリプトに関する初版の[動作と制限](block-editor.md#実行中の保存)を継承します。
`.sb3` に書くのは従来の確定済み引数文字列だけで、編集用階層・下書き・フラグ・UI状態を追加しません。

## 検証記録（2026-10-18）

変更範囲の検証:

```sh
npm run test:block-editor
npm run test:pages
```

結果はblock-editor 41件、Pages 3件が成功です。

探索境界、複数ノード一括適用、Undo/Redo、setter/listener失敗と再試行、無変更保存、競合、登録解除、非同期検証の中断、循環・深さ・ノード上限を実ScratchBlocks/VMで確認します。
実ReactModalで1モーダル、折りたたみ・遅延mount、未表示ノードの検証、エラーへのフォーカス、IME、保存中の操作抑止、全ビューの解放を確認します。
実VMからZIP形式の`.sb3`を保存し、新しいVMへ読み込み、値と接続、編集メタデータがないことも確認します。

Chromiumの実GUIでは、ローカルの管理対象サンプルを使って次を確認しました。

- 根・複数枝・未登録中間・孫・同opcodeの兄弟が6構造ノード／5フォームとして1モーダルに表示され、根の外側のnextとreporterを含めない。
- 根・子・孫の3ブロックを一括保存し、dirty通知1回、Undoイベントのgroup1個となる。キーボードのUndo/Redo各1回で全変更が戻る／再適用される。
- setter途中失敗とChangeイベントのlistener途中失敗をそれぞれ注入し、UI値・VM・dirty・Undo/Redoを復元する。同じ下書きの再保存でdirty通知1回、group1個として成功する。
- 孫の数量0で全体保存を止める。折りたたんでも下書きを保持し、エラーの選択で祖先を展開して数量欄へフォーカスする。キャンセルでlive値・dirty・Undoを変えない。
- GUIの「別ファイルで保存する...」で`.sb3`をダウンロードし、新規ページの標準`project_url`経路で読み込む。日本語・引用符・アンパサンドを含む値と、複数枝、外側のnext、reporterの接続を維持してフォームを再度開ける。
- 階層フラグOFFで同じ作品が1フォームの単一編集になり、基盤フラグOFFでは入口が0個になる。どちらも確定値と接続を保持する。

1280×800の画面で本文のスクロール中もフッターが画面内にあることを確認しました。
変更したGUIソースのESLint（プロジェクト設定で除外されるサンプルは構文検査）、development webpackコンパイル、`git diff --check`も成功しました。
全対応環境・テーマ・倍率の組合せ、安定版productionビルドはリリース時の検証とします。

## 作業の基点

実装ブランチは `feat/editor/descendant-dialog`。
初版修正とサイト機構を統合した `develop` の `dabdbd936a6f0855d20292111b6e8610ed534859` を基点としています。
最初の検証は初版修正を含む `6746e58dedfd0f94cc5f74ad957bcaec6e0761e4` 上で行い、作業中に完了したdevelopへの統合を取り込んでいます。GUI実装は同一で、競合した文書とPagesの出典表示はdevelopの仕組みに合わせています。
本書の記録はローカル検証結果であり、Issueの更新・PR作成・公開完了を示すものではありません。
