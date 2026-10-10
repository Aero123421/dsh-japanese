# DS Harness 日本語言語パック

公式DeepSeek Harnessの画面を日本語にし、Noto Sans JPを同梱するプラグインです。このリポジトリだけで開発・検証・配布できます。Piログインプラグインのインストールは不要です。

パッケージ名は`@local/dsh-japanese`です。対応確認の対象は公式`0.2.1-alpha.2`、コミット`d743267388641bc76f17c45ce8b4c231aed1d32c`です。検証する公式ソースを[upstream.json](upstream.json)に固定しています。

## ビルドとインストール

Node.js 22.19.0以上で実行します。

```sh
npm ci
npm run build
npm test
npm run pack:plugin
```

`artifacts/local-dsh-japanese-0.1.0.tgz`と`artifacts/SHA256SUMS`ができます。公式アプリのプラグイン管理画面から配布ファイルを指定してインストールし、バンドルを有効にしてください。ファイルの場所はHarnessのHostから参照できる必要があります。

Webプロファイルでは次のCLIでも追加できます。

```sh
dsh plugin --profile web add /absolute/path/local-dsh-japanese-0.1.0.tgz
```

デスクトップのプロファイルにはアプリのプラグイン管理画面を使います。更新した場合はアプリを再起動してください。設定の一般画面で言語を「日本語」にします。言語の選択と保存は公式のLocale APIが行い、ブラウザの言語検出と保存した言語選択を維持します。

## フォントと対象範囲

日本語のUIと会話本文に、同梱したNoto Sans JPを使います。フォントのOSへのインストールや、実行時のGoogle Fontsへの通信はありません。利用者が本文・コードのフォントを指定した場合は、その指定を優先します。日本語表示を解除すると追加したフォント指定も適用されなくなります。

Windows・macOS・Linuxで同じ書体を使えますが、文字の描画はOSやChromiumの版で多少異なります。ターミナルのフォント設定、文書プレビュー内部のフォント、Electron独自の案内・エラー画面は対象外です。システムプロンプトやモデルの応答指示は変更しません。未翻訳のキーは英語へフォールバックします。

## 検証と上流更新

```sh
npm run sync:contracts
npx playwright install chromium
npm run test:browser
```

初回の検証では固定した公式ソースを`.cache/upstream`へ取得します。単体テストは55名前空間・2527キーの翻訳と置換項目を比較し、配布用Clientのフォント・ライセンスも確認します。ブラウザ検証では公式のLocaleとスロットを使い、翻訳、同梱フォントの描画、利用者のフォント指定、明暗テーマ、狭い画面、言語変更、アンロードを確認します。スクリーンショットは`artifacts`に出力します。

GitHub Actionsには、依存関係・翻訳契約・ビルド・単体テスト・ブラウザ検証・パッケージ作成のチェックを設定しています。公式デスクトップへのインストールとWindows・macOS実機での表示は未検証です。

公式版へ追従する場合は`upstream.json`のコミット・バージョンを変更し、古い`.cache/upstream`を退避します。`npm run sync:contracts`で翻訳キーを取得して`translations`を更新し、ビルドと検証を実行してから配布してください。

コードと翻訳はMITです。Noto Sans JPはSIL Open Font License 1.1で配布し、`dist/Noto-Sans-JP-OFL.txt`にライセンスを同梱します。フォント提供元：[@fontsource-variable/noto-sans-jp](https://www.npmjs.com/package/@fontsource-variable/noto-sans-jp)、[Noto Sans JP](https://fonts.google.com/noto/specimen/Noto+Sans+JP)。
