# DS Harness 日本語言語パック

DeepSeek Harnessの画面を日本語にするプラグインです。日本語表示には同梱のNoto Sans JPを使います。

対応版：DS Harness `0.2.1-alpha.2` 以上、`0.3.0` 未満です。`0.2.1-alpha.3` 以降の `0.2.x` プレリリースも含みます。起動時の peer 検査は `@deepseek-ai/dsh*` を `>=0.2.1-alpha.2 <0.3.0-0` と比較します。`0.2.0-rc.2` 以前と `0.3.0` のプレリリースは対象外です。システムプロンプトは変更しません。

## 導入

サイドバーの「Plugins → Add plugin」を開き、次を入力します。

```text
github:Aero123421/dsh-japanese
```

「Install」→「Enable now」を押し、アプリを再起動します。ビルド済みのファイルとフォントを含むため、インストール時のビルドは不要です。特定の版を使う場合は[配布ファイルとチェックサム](https://github.com/Aero123421/dsh-japanese/releases/tag/v0.1.1)を使えます。

「設定 → 一般 → 言語」で「日本語」を選びます。保存済みの言語設定やブラウザの言語検出は引き続き使えます。プラグイン更新後はアプリを再起動してください。

WebプロファイルではCLIからも追加できます。

```sh
dsh plugin --profile web add -w github:Aero123421/dsh-japanese
```

## 表示とフォント

UIと会話本文にNoto Sans JPを使います。フォントファイルはプラグインに同梱され、DSHの同一オリジンから配信されます。ページの言語が日本語のときだけブラウザが取得します。外部のフォント配信は使いません。本文・コードのフォントを自分で指定した場合は、その設定を優先します。言語を日本語以外に切り替えると、追加したフォント指定も外れます。

ほかのプラグインが先に「日本語」を登録していても、このパックはそれを置き換えません。そのプラグインが外れ、このパックが有効なままなら、言語の一覧へ「日本語」を戻します。中国語の辞書はこのパックでは配りません。設定に出るこのパックの名前は、中国語では英語のままです。

Windows・macOS・Linuxで同じ書体を使えます。描画はOSやChromiumの版によって多少変わります。ターミナル、文書プレビュー内のフォント、Electron独自の案内・エラー画面は対象外です。未翻訳の表示は英語に戻ります。

検証には公式ソースを使ったブラウザのテスト画面を使用しています。公式デスクトップへのインストールとWindows・macOS実機での表示は未検証です。

[テストと公式版への更新手順](docs/development.md)

## ライセンス

コードと翻訳は[MIT](LICENSE)。Noto Sans JPはSIL Open Font License 1.1で、配布ファイルの`dist/Noto-Sans-JP-OFL.txt`にライセンスを同梱します。

フォント提供元：[@fontsource-variable/noto-sans-jp](https://www.npmjs.com/package/@fontsource-variable/noto-sans-jp)、[Noto Sans JP](https://fonts.google.com/noto/specimen/Noto+Sans+JP)。

## 更新する

「設定 → 日本語パック」に実行版と更新操作を表示します。「更新を確認」は正式Releaseを確認するだけで、「更新する」で選択した版をDSHのplugin managerへ渡します。日本語・英語の文言とDSHのUI部品を使います。表示言語、テキスト・コード用フォント、他の辞書やstyle、システムプロンプトは変更しません。

GitHub導入は明示したReleaseタグへの固定、Release tgz導入はサイズ制限付きで取得・SHA-256照合したファイルを使い、現在の配布経路とbundleのON/OFFを維持します。候補のpackage名・版・bundle宣言・DSH互換性を確認します。ダウンロード済みtgzは`local-dsh-japanese-<導入版>.tgz`の通常ファイルとして配布経路を判定します。この名前だけで既存ファイルの発行者を保証するものではありません。

再起動待ちと実行版の反映確認を区別します。接続が切れた場合は同じ導入を再送せず、操作ID・導入版・実行版を照合します。取得できない結果は「結果が不明」と表示します。機密情報を含まない操作ID・候補版・結果だけをprofileの`.dsh-japanese-update`に保存します。profileが参照する検証済みtgzは保持します。

DSH 0.2.1-alpha.3 以降で HMR が有効なとき、導入済みと同じ spec へのインストールは profile を変えずに `already-installed` で失敗します。その場合はパッケージを外してから、選択した版を同じ ON/OFF で導入します。公式のプラグイン画面も、更新対象の外からこの順で行います。導入に失敗してパッケージが無くなっているときは、直前の導入元を戻します。戻せなかったときは、日本語パックの画面に「以前の版も戻せなかった」ことと、入れ直し方を表示します。画面が消えている場合は、設定の「プラグイン」で「プラグインを追加」を開き、`github:Aero123421/dsh-japanese` を入力するか、Webプロファイルで次を実行してください。

```sh
dsh plugin --profile web add -w github:Aero123421/dsh-japanese
```

別の Git タグや別の tarball は、これまでどおり `installBundle` だけで導入します。

plugin managerがない構成、読み取り専用、開発ディレクトリ等では手動更新先を表示します。slotsやconnectionがない構成でも辞書とフォントは動作します。このパックをOFFにすると専用画面も消えるため、DSH標準の「設定 → プラグイン」または次のCLIで更新してください。元がOFFの場合は、更新後に標準画面でOFF状態を確認してください。

```sh
dsh plugin --profile web add -w github:Aero123421/dsh-japanese#v0.2.0
```

画面からの更新はOFF状態を維持します。CLIの`add`は導入時の有効化を行うため、OFFを維持する必要がある場合はDSH標準のplugin managerから更新してください。

更新操作のブラウザー内記録は接続先のプロファイルごとに保存します。再接続時はDSHが保持する最新の操作を優先し、結果不明の導入を再送しません。
