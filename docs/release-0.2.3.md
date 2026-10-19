# 0.2.3 更新内容

辞書の固定を DSH `0.2.1-rc.2`（`687f282e8625c6b8d11ff58211a90524be2e4317`）へ上げました。公式UIの 58 名前空間・2664 キーに日本語があります。Web検索の Messages API（ベースURL、接頭辞、補助モデルの検索回数）も rc.2 の英語に合わせています。

互換性のないプラグインの説明は、プラグイン名と実行中の版だけを埋めます。alpha.2 と alpha.3 は要求の名前が `{peers}`、rc.2 は `{requirements}` です。両方を1文に書くと、使わない方が画面に残ります。要求の一覧は日本語から外しています。再起動を求める文の `{reason}` も alpha.2 の英語に無いため外し、再起動が必要なことだけを書きます。

設定の項目名は「組込プラグイン」「動作プリセット」、外観は「システム」です。プリセットカードの「標準モード」は、英語の “Standard mode” も同じ幅で切れます。こちらは訳を短くしていません。

Noto Sans JP の woff2 は `dist/fonts/` にあり、DSH が `/dsh-japanese/fonts/` で配信します。許可するファイル名は、ビルドがそこにコピーした一覧です。数字のサブセットに加え、latin、latin-ext、cyrillic、vietnamese も返します。ページの言語が日本語のときだけスタイルへ `@font-face` を入れます。ログインしていない index は 401 のまま、フォントの GET は 200 です。ファイルは OFL の書体で、認証クッキーが無い公開URLからも同じパスで取れます。rc.2 のソースに `dsh-cf` というホスト名はありません。

ほかのプラグインが先に `ja` を登録しても置き換えません。そのプラグインを外すと、このパックが有効な間は「日本語」を戻します。ページの再読み込みは不要です。中国語の辞書は追加していません。中国語の設定では、このパックの項目名は English の “Japanese pack” のままです。

## 確認

- `npm test`、`tsc --noEmit`、`npm run test:browser`、`node scripts/check-dsh-compat.mjs --online`。
- rc.2、alpha.2、alpha.3 のプラグイン導入画面で、互換性のないパッケージの文に `{peers}` も `{requirements}` も出ていません。実行中の版はそれぞれの文字列に入っています。
- rc.2 で英語の再読み込みは woff2 を要求せず、日本語は `127.0.0.1` の `/dsh-japanese/fonts/` だけを要求しました。
- 先に `ja` を登録したプラグインを外すと、再読み込みなしで言語名が「日本語」に戻りました。

## 既知の問題

- プリセットカードの題名は、日本語の「標準モード」も英語の “Standard mode” も枠より広く、末尾が切れます。DSH側のカード幅です。
- トーストの折り返しで末尾の1文字が孤立することがあります。DSHのトースト幅です。草案は [docs/upstream-issues/ja-7-toast-wrap.md](upstream-issues/ja-7-toast-wrap.md)。
- 幅 390px の設定は、項目の列が本文の上に乗らず、画面が横にはみ出すことがあります。草案は [docs/upstream-issues/ja-8-mobile-settings.md](upstream-issues/ja-8-mobile-settings.md)。

この文書の版は GitHub Release にしていません。パックの「更新する」は公開済みの最新 Release を導入するため、このブランチの 0.2.3 はそこからは選べません。
