# テストと公式版への更新

[upstream.json](../upstream.json)に検証対象の公式コミットを固定しています。初回の検証でソースを`.cache/upstream`に取得します。

## テスト

ソースからビルドするにはNode.js 22.19.0以上が必要です。

```sh
npm ci
npm run build
npm test
npm run sync:contracts
npx playwright install chromium
npm run test:browser
npm run pack:plugin
```

`npm test`は55名前空間・2527キーの翻訳、置換項目、フォント同梱とライセンスを確認します。`sync:contracts`は公式の翻訳キーを`tests/fixtures/upstream-dictionaries.json`に書き出します。

ブラウザテストは公式のLocaleとスロットを使い、翻訳、フォント描画、利用者のフォント指定、明暗テーマ、狭い画面、言語切り替え、プラグイン解除を確認します。スクリーンショットは`artifacts`に保存します。Piプラグインは読み込みません。

GitHub Actionsにも同じチェックを設定しています（`.github/workflows/ci.yml`）。翻訳キーの差分が残るとCIは失敗します。配布ファイルとチェックサムは`artifacts`に出力します。

## 公式版への更新

1. `upstream.json`のコミットとバージョンを変更し、古い`.cache/upstream`を退避します。
2. `npm run sync:contracts`を実行し、`translations`の辞書を更新します。
3. ビルドとテストを実行し、配布ファイルを作り直します。

言語の選択と保存にはDSのLocale APIを使います。画面とフォントの変更はClient側で行います。
