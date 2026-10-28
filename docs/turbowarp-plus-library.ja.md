# TurboWarp Plusの機能拡張一覧

関連Issue: `kubohiroya/scratch-gui#68`。共通UIは
`kubohiroya/turbowarp-extension-security-dialog#28`、カタログ生成は
`kubohiroya/turbowarp-plus-packages#36`に依存します。
セクション表示と選択状態の改善は `kubohiroya/scratch-gui#70` で扱います。

## 起動時フラグ

読み取り箇所は `src/config/feature-flags.js` です。既定OFFで、起動時のURLに
`twPlusExtensions=1` が指定された場合だけ有効になります。
例: `editor.html?lang=ja&twPlusExtensions=1`。
起動後のURL変更は反映せず、再読み込みで切り替えます。

有効時は「すべて」「Scratch」「TurboWarp」の右に、公式アイコン付きの薄水色の
「TurboWarp Plus」ボタンを表示します。狭い画面ではタグ列を横にスクロールできます。
Plus一覧で検索してもPlusカテゴリを維持します。その他のライブラリは従来の表示を使います。

## カタログと読み込み

次のHTTPS URLからJSONを取得し、共通UIの `loadExtensionCatalog` で検証します。

`https://kubohiroya.github.io/turbowarp-plus-packages/extensions-v1.json`

契約は `schemaVersion: 1`、`extensions` の各要素に
`id` / `name` / `version` / `url` / `dependencies` を必須とします。
任意の説明、日英説明、著者、ライセンス、バナー、リポジトリ、必要実行モードも表示します。
配布URLと画像URLはHTTPSで、依存先は拡張IDです。重複ID・URL、不明な依存・循環を拒否します。
取得は認証情報なしで実施し、15秒で中断します。失敗時は一覧内の再試行ボタンを表示します。

右端のチェックボックスで複数選択できます。推移的依存は自動選択され、解除不可になります。
一覧の画像は元の縦横比を保って全体を表示し、ブロックアイコンの上下を切り取りません。
パッケージのドキュメントにはJSONの `docsURL`（確認済みGitHub Pages）を表示し、GitHub・npmのアイコンからリポジトリとパッケージページへ移動できます。選択一覧の「詳細」とCDNのJS URL表示は撤去します。
「サンドボックスなし：必要／任意／不要／未確認」を各行へ明示し、必要な場合は警告アイコンを表示します。製作者は公開版 `package.json` の `author.name` を優先し、同じ `author.url` が明示されていれば製作者名へリンクします。
ライセンスは拡張ヘッダーの宣言をそのまま表示し、ヘッダーにない場合は公開 `package.json` の `license` を使用します。どちらにも記載がない場合は「ライセンス: 未記載」と表示します。
画像・元の縦横比での表示・GitHub/npmリンク・実行条件・カテゴリ見出しは、読み込み前のセキュリティ確認と共通化します。両方の「詳細」ボタンは表示しません。セキュリティ確認で必要なメタデータ取得・実行許可の選択は維持します。
セキュリティ確認の一覧上部に「⚠️マークの表示されている拡張を制作者の意図どおりに動作させるためには『サンドボックスなし』を選択してください。」をまとめて表示します。フッターのボタンの上には「『キャンセル』で選択一覧に戻ります。」を表示し、同じ案内を各パッケージには繰り返しません。
Plus一覧のチェックボックスは32×32px（従来16pxの2倍）とし、権限確認のラジオボタンは従来の大きさを維持します。
読み込み済みのIDも選択済み・解除不可とし、VMへの重複読み込みを避けます。
読み込み確定後、既存の共通セキュリティ確認で各URLの実行モードを明示的に選びます。
取り消すと、チェック状態を保った選択一覧に戻ります。

### セクションと選択状態の改善

カタログJSON v1は、任意の `categories: [{id, title, titleJa?}]` と、各拡張の
`category` にカテゴリIDを持てます。共通UIのparserがID参照をカテゴリ情報へ展開し、
Editorは従来どおり返された拡張配列を `ExtensionSelectionList` へ渡します。
カテゴリはJSONの定義順に見出し付きセクションとして表示し、カテゴリのない従来カタログは
従来の一覧表示を維持します。日本語では `titleJa` があれば使用します。

各行は「手動で選択」「依存関係で自動選択」「未選択」を状態ラベル・アイコン・色で区別します。
読み込み済みは別の「読み込み済み」表示です。手動で選んだ拡張が後から別の選択の依存先に
なっても、手動選択の表示を保ち、「Bubble に必要」などの依存理由を併記します。
依存先として必要な間はチェックボックスを解除不可にし、必要な選択を解除すると再び操作できます。

許可された拡張は `extensionManager.loadExtensionURL` に依存順で渡します。
依存先を拒否した場合は、その依存先を必要とする拡張も実行しません。
ホスト独自の読み込み可否・サンドボックス方針を優先します。
標準ホストの実行モード指定はURLと読み込み中のバッチに限定し、成功・失敗とも解除します。
途中で失敗した場合は、読み込み済み拡張を保持し、残りを再選択できます。

## ローカル検証

共通UIは `package.json` / lockfileで次のmerge SHAへ固定しています。

`efda2fdf89b5eb0e8dcd844eb6a7dc6a8c812b7e`

通常の依存インストール後は、この確定版のAPIを使ってビルドします。
セクション表示と選択状態の改善もこの固定版に含まれます。
共通UIを別checkoutで変更して確認したい場合は、共通UIでビルドを実行した後、
次の専用プレビューでローカルcheckoutを接続します。

```sh
SECURITY_DIALOG_SOURCE=/path/to/turbowarp-extension-security-dialog PORT=8602 node scripts/local-plus-preview.cjs
```

このスクリプトは共通UIのcore/react/TurboWarp/CSSのみをWebpack aliasで接続し、既存の
`node_modules` と依存バージョンを変更しません。Webpack 4向けにCJS成果物を使用します。
通常のインストール時に生成されるmicro:bitの生成ソースとHEXも必要です。
画面確認URLは `http://127.0.0.1:8602/editor.html?lang=ja&twPlusExtensions=1` です。
Pages公開前の検証では、ブラウザのネットワークrouteでこのHTTPS URLへ生成済みJSONを応答します。

関連テスト:

```sh
node --test test/unit/extension-security/plus-library.test.cjs
```

確認対象は依存順、既読込skip、拒否の推移、実行モードのスコープ、ホスト方針、失敗後の再試行、
カタログIDの登録確認、Plus検索中のカテゴリ維持、画面破棄後の遅延完了による画面遷移の抑止です。

## 公開順と切り戻し

公開操作には別途明示承認が必要です。順序は共通UIをmergeして参照可能なSHAを確定、
GUIの依存SHAとlockfileを更新・最小検証、GUIをmerge、Pagesのカタログを公開です。
Pagesを先に公開してもGUIの既定OFFは維持します。3リポジトリの参照先が揃ってから有効化します。

切り戻しは `twPlusExtensions=1` をURLから除去してEditorを再読み込みします。
これによりPlusの入口を非表示にできます。既存プロジェクトからの拡張読み込みと、セキュリティ確認は
従来どおりです。接続差分のrevertによる切り戻しも可能です。

## アイコン

`src/components/tw-plus-library/icon.svg` は
`kubohiroya/turbowarp-plus-packages` の `site/assets/icon.svg` を使用しています。
同リポジトリのGPL-3.0ライセンスに従います。
