# Plus作品拡張のホスト接続

対象: [Editor Issue #4](https://github.com/kubohiroya/turbowarp-plus-editor/issues/4)

`tw-security-manager` は通常拡張の確認フックを接続した後、`startupPlusExtensionHost(vm)` を同期的に呼ぶ。通常起動で既定ONとなり、作品ロード前にフックが設置される。`twPlusExtensionLoader=0` を起動URLへ指定するとOFFへ戻せる。従来の `=1` は引き続きONとなり、不正値はOFFとする。起動後のURL変更や作品のManifestは設定を変更しない。従来のPlusギャラリー用フラグとロード処理は維持する。

`installPlusExtensionHost(vm, options)` はDOMとVMだけで使える。Packagerの信頼済みbootstrapは `enabled:true` を明示する。これはLoaderを接続する設定で、拡張コードの実行許可ではない。各拡張の取得・検証後には必ずホストの許可判断が必要である。

## 許可と診断

画面にはID、取得元、申告発行者（本人性未検証）、バージョン、SHA-256、unsandboxed実行、要求権限を表示する。サンドボックス外のJSが広い権限を持つことを説明し、「許可しない」を初期フォーカスにする。拒否、Escape、閉じる操作、AbortSignal、ホスト終了は許可にならない。文字列はtextContentで表示する。

セッション内の承認判定はLoaderの `createSessionTrustProvider` に集約する。同じdigestだけでなくID、取得元、バージョン、申告発行者、capabilities、依存一覧も一致する場合に限って再利用する。作品に承認履歴を書き込まず、localStorageにも保存しない。ホスト終了時に承認を取り消す。

呼出元が `props.securityManager` に独自のURLロードポリシーを提供した場合は、その関数ポートをLoaderに渡す。LoaderはUIや承認キャッシュを使う前にこの制約を確認し、ロード拒否やunsandboxed以外の実行モードをユーザー承認で上書きしない。URLだけを扱う独自ポリシーではEmbeddedの可否を判断できないため、Embeddedを拒否する。GUI自身の通常確認関数はこのポートへ二重に接続しない。

検証・認可・登録・失敗の履歴を画面の「拡張の検証・許可」に表示する。不正ManifestやZIPなど登録前の失敗もbridgeから表示する。診断UIに失敗しても認可結果を変更しない。

## オフラインと保存

既定キャッシュはLoaderが提供する `createMemoryContentCache` を使う。8 MiB、1時間の有効期限、容量超過時のLRU削除を持ち、読み出すたびにLoaderがdigestを再検証する。キャッシュは取得を代替するだけで、実行許可にはならない。セッション終了後の永続オフライン保存は実装していない。SB3へ埋め込む場合は同梱バイト列が取得元になる。

GUIは `tw-plus-project-loader` でVMのロードと3つの保存経路を接続する。Manifestの解析、ZIP制約、メタデータ復元はLoaderのproject-codecへ委譲する。旧ギャラリーの `tw-plus-extension-loader.js` は別の機能であり、置き換えない。

`dispose()` は許可UIを閉じ、進行中ロードにキャンセルを通知し、登録解除後にフックを復元する。解除に失敗したVMでは処理を続行せず、ホストを破棄して再作成する。特権JSのネットワークやDOMの任意の副作用まで巻き戻せることは保証しない。

## 検証

```sh
node --test test/unit/extension-loader/permission-ui.test.mjs test/unit/extension-loader/host.test.mjs
```

許可・拒否・close・abort、文字列の安全な表示、診断上限を検証する。実VMとの結合では、承認前にコードを実行しないこと、承認後のScratch.vmアクセス、保存Manifestの保持、キャッシュによるオフライン再読込、登録解除を確認する。ブラウザーE2EはEditor側で行う。

## 標準Desktopとの境界

署名済みTurboWarp Desktop 1.17.0（Electron 43.8.3 / Chrome 150.0.7871.250）を専用の新規プロファイルで測定した。標準EditorにはPlus Loader bootstrapがなく、Manifestだけで同梱JSを実行することはない。一方、保存時には独自Manifest・未知フィールド・追加ZIPエントリが失われた。通常DesktopでPlus形式を保存し直すことを移行手段として扱わない。

この署名版はNode CLI inspector fuseを無効にしているためPlaywright `_electron.launch` では接続できない。アプリを変更せずChromium CDPへ接続する検証スクリプトをEditorの `test/e2e/extension-loader/desktop.cjs` に用意した。`--user-data-dir` に検証専用ディレクトリを渡す。Electronは[PreSandboxStartupでこのパスを適用する](https://github.com/electron/electron/blob/main/shell/app/electron_main_delegate.cc#L271)。既存プロファイルやアプリ本体は編集しない。

SB3の `meta.vm = "0.2.0"` はシリアライズ形式の目印であり、Desktopに同梱されたVMパッケージの完全なバージョン番号ではない。標準Desktop Editorへの本機能組み込みと、Loader付きの生成HTMLをElectronで実行する構成を区別する。

同じ専用プロファイルの使い捨てテスト画面をLoader付きの生成HTMLへ移動した構成でも確認した。許可前の登録は0件、許可後は同梱拡張が実VMへ1回登録・実行され、reporterブロックが42を返し、HTTP(S)リクエストは0件だった。生成HTMLは信頼済みLoaderコードを自身に同梱している。標準Desktop EditorがSB3のManifestだけで権限を付与した結果ではない。

測定結果と画面はEditorの `.host/issue-4-artifacts/desktop-result.json`、`desktop-stock.png`、`desktop-packaged.png` に保存する。再検証はmacOSで `node test/e2e/extension-loader/desktop.cjs` を実行する。アプリがない環境や生成HTMLがない状態で成功扱いにせず、失敗理由を記録して非0で終了する。
