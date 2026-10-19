# テストと公式版への更新

[upstream.json](../upstream.json)に検証対象の公式コミットを固定しています。初回の検証でソースを`.cache/upstream`に取得します。

## テスト

ソースからビルドするにはNode.js 22.19.0以上が必要です。

```sh
npm ci
npm run build
npm test
node scripts/check-dsh-compat.mjs --online
npm run sync:contracts
npx playwright install chromium
npm run test:browser
npm run pack:plugin
```

`npm test`は58名前空間・2664キーの翻訳、各対応版の英語辞書との置換項目、フォントファイルとライセンスを確認します。`sync:contracts`は`upstream.json`に固定した公式ソースの翻訳キーを`tests/fixtures/upstream-dictionaries.json`に書き出します。固定コミットが変わると`.cache/upstream`を取り直します。現在の固定は DSH `0.2.1-rc.2`（`687f282e8625c6b8d11ff58211a90524be2e4317`）です。`tests/fixtures/en-by-version/`には `0.2.1-alpha.2` と `0.2.1-alpha.3` の英語辞書があり、日本語の置換項目をそれぞれの英語と照合します。

`node scripts/check-dsh-compat.mjs`は peer の範囲が `0.2.1-alpha.2` から次の `0.2.x` プレリリースまでを含み、`0.3.0` のプレリリースを含まないことを確認します。比較は app-boot の `semver.satisfies(..., { includePrerelease: true })` と同じです。`--online` を付けると、GitHub の最新 DSH Release がその範囲外なら失敗します。範囲外の新しい版では起動時にこのプラグインが読み飛ばされます。

ブラウザテストは公式のLocaleとスロットを使い、翻訳、フォント描画、利用者のフォント指定、明暗テーマ、狭い画面、言語切り替え、プラグイン解除を確認します。スクリーンショットは`artifacts`に保存します。Piプラグインは読み込みません。

GitHub Actionsにも同じチェックを設定しています（`.github/workflows/ci.yml`）。翻訳キーの差分が残るとCIは失敗します。配布ファイルとチェックサムは`artifacts`に出力します。

## GitHubからの配布

`main`にはビルド済みの`dist/`を含めます。変更後に`npm run build`を実行し、更新した`dist/`も一緒にコミットしてください。CIで再ビルドし、コミット済みのファイルとの差分が残ると失敗します。インストール時に実行するビルド用スクリプトは追加しません。

版を上げるときは`package.json`、`package-lock.json`、READMEのReleaseリンクを更新し、ビルドと検証を行います。GitHub Releasesにも`npm run pack:plugin`で作った配布ファイルと`SHA256SUMS`を置きます。

## 公式版への更新

1. `upstream.json`のコミットとバージョンを変更し、古い`.cache/upstream`を退避します。
2. `npm run sync:contracts`を実行し、`translations`の辞書を更新します。
3. ビルドとテストを実行し、配布ファイルを作り直します。

言語の選択と保存にはDSのLocale APIを使います。画面とフォントの変更はClient側で行います。
