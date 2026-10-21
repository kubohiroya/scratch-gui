# 共通のカメラ入口

関連: [Issue #51](https://github.com/kubohiroya/scratch-gui/issues/51)。Camera Source #55 → app #952が登録APIへ直列に依存する。

`Scratch.gui.cameraControls.registerProvider`は、停止ボタン後方の「カメラ」入口と設定パネルを提供する。登録がなければ入口は表示されない。位置指定・ドラッグによる移動APIは提供しない。

登録には`id`・`cameraId`・`kind`（`permission`または`settings`）・`element`を指定する。設定側は`running`、`onOpen`・`onClose`・`onStart`を渡せる。戻り値の`update({visible, running})`で状態を通知し、`dispose()`で解除する。同じIDの古いhandleからの更新・解除は無視する。

同じcameraIdの登録を一つにまとめ、起動中の設定、許可待ち、未起動の設定の順に表示する。複数cameraIdも入口は一つで、パネル内で切り替える。未起動の設定から入口を開いた操作だけが`onStart`を呼ぶ。これはブラウザー管理の許可要素を配置するためで、撮影を自動開始したり、その要素を代理クリックしたりしない。許可の応答でproviderが切り替わっても、開始処理を自動再試行しない。

GUIが所有するものは配置・開閉・Escape/外側クリック・テーマ色。Camera Sourceが汎用設定のDOMとカメラ状態を所有し、appは作品のpreview portを接続する。GUIはgetUserMediaを呼ばず、カメラ状態をDOMから推測しない。

プロジェクト読込時は登録を消去する。providerは停止/破棄時に自分のDOM・タイマー・非同期処理・ストリームownershipを片付ける。登録内容のDOMはパネルを開く間だけGUIに接続する。

受け入れ条件は、入口が停止ボタン後方に一つ、許可から設定への切替、設定操作、閉じる/停止/プロジェクト読込時の後始末。切戻しはこのAPIと利用側の差分をrevertする。API非対応ホストでは利用側の既存fallbackが残る。
