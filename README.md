# DS Harness 日本語言語パック

DeepSeek Harnessの画面を日本語にするプラグインです。日本語表示には同梱のNoto Sans JPを使います。

対応版：DS Harness `0.2.1-alpha.2`。システムプロンプトは変更しません。

## 導入

サイドバーの「Plugins → Add plugin」を開き、次のURLを入力します。

```text
https://github.com/Aero123421/dsh-japanese/releases/download/v0.1.0/local-dsh-japanese-0.1.0.tgz
```

「Install」→「Enable now」を押し、アプリを再起動します。[配布ファイルとチェックサム](https://github.com/Aero123421/dsh-japanese/releases/tag/v0.1.0)はGitHub Releasesにあります。

「設定 → 一般 → 言語」で「日本語」を選びます。保存済みの言語設定やブラウザの言語検出は引き続き使えます。プラグイン更新後はアプリを再起動してください。

WebプロファイルではCLIからも追加できます。

```sh
dsh plugin --profile web add https://github.com/Aero123421/dsh-japanese/releases/download/v0.1.0/local-dsh-japanese-0.1.0.tgz
```

## 表示とフォント

UIと会話本文にNoto Sans JPを使います。フォントのインストールや外部ダウンロードは不要です。本文・コードのフォントを自分で指定した場合は、その設定を優先します。言語を日本語以外に切り替えると、追加したフォント指定も外れます。

Windows・macOS・Linuxで同じ書体を使えます。描画はOSやChromiumの版によって多少変わります。ターミナル、文書プレビュー内のフォント、Electron独自の案内・エラー画面は対象外です。未翻訳の表示は英語に戻ります。

検証には公式ソースを使ったブラウザのテスト画面を使用しています。公式デスクトップへのインストールとWindows・macOS実機での表示は未検証です。

[テストと公式版への更新手順](docs/development.md)

## ライセンス

コードと翻訳は[MIT](LICENSE)。Noto Sans JPはSIL Open Font License 1.1で、配布ファイルの`dist/Noto-Sans-JP-OFL.txt`にライセンスを同梱します。

フォント提供元：[@fontsource-variable/noto-sans-jp](https://www.npmjs.com/package/@fontsource-variable/noto-sans-jp)、[Noto Sans JP](https://fonts.google.com/noto/specimen/Noto+Sans+JP)。
