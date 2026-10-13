# DS Harness 日本語言語パック

DeepSeek Harnessの画面を日本語にするプラグインです。日本語表示には同梱のNoto Sans JPを使います。

対応版：DS Harness `0.2.1-alpha.2`。システムプロンプトは変更しません。

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

UIと会話本文にNoto Sans JPを使います。フォントのインストールや外部ダウンロードは不要です。本文・コードのフォントを自分で指定した場合は、その設定を優先します。言語を日本語以外に切り替えると、追加したフォント指定も外れます。

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

plugin managerがない構成、読み取り専用、開発ディレクトリ等では手動更新先を表示します。slotsやconnectionがない構成でも辞書とフォントは動作します。このパックをOFFにすると専用画面も消えるため、DSH標準の「設定 → プラグイン」または次のCLIで更新してください。元がOFFの場合は、更新後に標準画面でOFF状態を確認してください。

```sh
dsh plugin --profile web add -w github:Aero123421/dsh-japanese#v0.2.0
```

画面からの更新はOFF状態を維持します。CLIの`add`は導入時の有効化を行うため、OFFを維持する必要がある場合はDSH標準のplugin managerから更新してください。
