# 英語と同一だった 99 キー

rc.2 の公式 UI 2664 キーを、日本語の値と英語の値で比べた結果です。値が英語と同一だったのは 99 件で、JA-1 の 109 キーも含みます。欠けは 0 件です。

(b) の 11 件は訳しました。残る 88 件は (a) で、`tests/fixtures/english-identical-allowlist.json` にあります。`tests/translations.test.mjs` の `Japanese text matches English only for keys on the allowlist` が、英語と同一のキーはこの一覧だけであることを確認します。CI のジョブ `japanese` の `npm test` で実行されます。

## (b) 訳したキー

| キー | 英語 | 日本語 | 理由 |
| --- | --- | --- | --- |
| `command.token.goal` | `goal` | `目標` | メニューで選んだときと、/ のあとに打てる名前。項目名の「目標」に合わせた。英語の /goal もそのまま使える |
| `command.token.plan` | `plan` | `計画` | 項目名の「計画」に合わせた。英語の /plan もそのまま使える |
| `command.token.feedback` | `feedback` | `フィードバック` | 項目名の「フィードバック」に合わせた |
| `command.token.permission` | `permission` | `権限` | 項目名の「権限」に合わせた |
| `command.token.export` | `export` | `エクスポート` | 項目名の「エクスポート」に合わせた |
| `conversation.tool.title.bash` | `Bash` | `コマンドを実行` | ほかのツール名は動作の説明になっている。公式の中国語は「运行命令」 |
| `conversation.tool.title.pwsh` | `Pwsh` | `コマンドを実行` | Bash と同じ動作の説明。公式の中国語も両方を「运行命令」にしている |
| `conversation.tool.title.grep` | `Grep` | `ファイル内容を検索` | ファイルの中身を探す動作。公式の中国語は「搜索文件内容」 |
| `conversation.tool.title.glob` | `Glob` | `ファイルを検索` | ファイルを探す動作。公式の中国語は「查找文件」 |
| `pluginManager.sentenceSeparator` | ` `（空白） | （空） | 互換性の説明を文のあいだでつなぐ。日本語は句点で終わるので、英語の空白を入れると文のあいだに空白が出る。公式の中国語は空文字 |
| `trajectory.timing.ttft` | `TTFT` | `最初のトークンまでの時間` | 同じ画面の「最初のトークンの時刻なし」に合わせた。時間の並びも「最初のトークンまでの時間 {ttft}」にした |

`trajectory.timeline.ttftDecoding` は英語と同一ではありませんでしたが、先頭の TTFT が残っていました。同じ言い方にして「最初のトークンまでの時間 {ttft} · デコード{decoding}」にしました。

## (a) 訳さないキー

画面に出ても、固有名詞、製品名、URL、コード、数値、単位、書式、置換項目だけで、訳す語がないものです。

| キー | 英語 | 分類 |
| --- | --- | --- |
| `chat.clock.md` | `{m}/{d}` | 月日の書式。語がない |
| `chat.clock.ymd` | `{y}-{m}-{d}` | 年月日の書式。語がない |
| `chat.duration.milliseconds` | `{milliseconds}ms` | 単位 ms |
| `chat.message.stepProcess.sharedPrefix` | （空） | 空文字。語がない |
| `chat.message.turnProcess.separator` | ` · ` | 区切りの中黒 |
| `chat.number.groupSeparator` | `,` | 桁区切りの記号 |
| `common.json.label` | `JSON` | 形式名 JSON |
| `common.number.million` | `{value}M` | 単位 M |
| `common.number.thousand` | `{value}K` | 単位 K |
| `common.ok` | `OK` | 操作名として定着している OK |
| `conversation.detail.field.id` | `ID` | 欄名 ID。公式の中国語も ID |
| `conversation.tool.preparing.content` | `{kilobytes}KB` | 単位 KB |
| `conversation.web.http` | `HTTP` | プロトコル名。公式の中国語も HTTP |
| `deepseek-model-label-1017.badge.label` | `1017` | モデル番号 |
| `deliverables.changes.added` | `+{count}` | 追加行の記号 |
| `deliverables.changes.deleted` | `-{count}` | 削除行の記号 |
| `documentHtml.title` | `HTML` | 形式名 HTML。公式の中国語も HTML |
| `documentMarkdown.viewer.label` | `Markdown` | 形式名 Markdown。公式の中国語も Markdown |
| `open-in-app.app.androidstudio` | `Android Studio` | アプリの製品名 |
| `open-in-app.app.cursor` | `Cursor` | アプリの製品名 |
| `open-in-app.app.finder` | `Finder` | アプリの製品名 |
| `open-in-app.app.fork` | `Fork` | アプリの製品名 |
| `open-in-app.app.ghostty` | `Ghostty` | アプリの製品名 |
| `open-in-app.app.gitbash` | `Git Bash` | アプリの製品名 |
| `open-in-app.app.github` | `GitHub Desktop` | アプリの製品名 |
| `open-in-app.app.gitkraken` | `GitKraken` | アプリの製品名 |
| `open-in-app.app.gnometerminal` | `GNOME Terminal` | アプリの製品名 |
| `open-in-app.app.goland` | `GoLand` | アプリの製品名 |
| `open-in-app.app.intellij` | `IntelliJ IDEA` | アプリの製品名 |
| `open-in-app.app.iterm` | `iTerm2` | アプリの製品名 |
| `open-in-app.app.kitty` | `kitty` | アプリの製品名 |
| `open-in-app.app.konsole` | `Konsole` | アプリの製品名 |
| `open-in-app.app.phpstorm` | `PhpStorm` | アプリの製品名 |
| `open-in-app.app.pycharm` | `PyCharm` | アプリの製品名 |
| `open-in-app.app.rider` | `Rider` | アプリの製品名 |
| `open-in-app.app.rustrover` | `RustRover` | アプリの製品名 |
| `open-in-app.app.smartgit` | `SmartGit` | アプリの製品名 |
| `open-in-app.app.sourcetree` | `Sourcetree` | アプリの製品名 |
| `open-in-app.app.sublimemerge` | `Sublime Merge` | アプリの製品名 |
| `open-in-app.app.sublimetext` | `Sublime Text` | アプリの製品名 |
| `open-in-app.app.tower` | `Tower` | アプリの製品名 |
| `open-in-app.app.vscode` | `VS Code` | アプリの製品名 |
| `open-in-app.app.vscodeinsiders` | `VS Code Insiders` | アプリの製品名 |
| `open-in-app.app.warp` | `Warp` | アプリの製品名 |
| `open-in-app.app.webstorm` | `WebStorm` | アプリの製品名 |
| `open-in-app.app.windowsterminal` | `Windows Terminal` | アプリの製品名 |
| `open-in-app.app.windsurf` | `Windsurf` | アプリの製品名 |
| `open-in-app.app.xcode` | `Xcode` | アプリの製品名 |
| `open-in-app.app.zed` | `Zed` | アプリの製品名 |
| `pluginManager.installGuideIdExample` | `dsh-plugin-whale-pet` | 入力例のパッケージ ID |
| `pluginManager.registryCustomPlaceholder` | `https://npm.example.com/` | 入力例の URL |
| `pluginManager.versionTag` | `v{version}` | 版の表記 v{version} |
| `pluginMarket.entryMeta` | `{version} · {date}` | 一覧に出る版と日付の行。{version} と {date} と中黒だけで、訳す語がない。中黒はほかの日本語でも区切りに使っている。置換項目を変えると版と日付が入らない。公式の中国語も同じ |
| `pluginMarket.entryMetaAuthor` | `{version} · {author} · {date}` | 作者があるときの同じ行。{version}、{author}、{date} と中黒だけで、訳す語がない。置換項目を変えると版・作者・日付が入らない。公式の中国語も同じ |
| `pluginMarket.sourcePlaceholder` | `https://example.com/index.json` | 発見タブの索引 URL 欄に出る例。語はなく、別の文字にすると例の URL ではなくなる。公式の中国語も同じ URL |
| `schedule.catalog.cron.day.weekdays` | `{weekdays}{months}` | 置換項目だけ |
| `schedule.catalog.cron.hours.list` | `{hours}` | 置換項目だけ |
| `schedule.catalog.cron.part.join` | ` `（空白） | cron の部品を並べる空白。式の区切り |
| `schedule.catalog.cron.weekday.name` | `{weekday}` | 置換項目だけ |
| `schedule.catalog.frequency.cronLocal` | `Cron {expression}` | Cron は式の名前。同じ辞書のタイムゾーン付きも Cron のまま |
| `schedule.catalog.time.utcPrefix` | `UTC` | タイムゾーン名 UTC |
| `schedule.manager.cron.day.weekdays` | `{weekdays}{months}` | 置換項目だけ |
| `schedule.manager.cron.hours.list` | `{hours}` | 置換項目だけ |
| `schedule.manager.cron.part.join` | ` `（空白） | cron の部品を並べる空白。式の区切り |
| `schedule.manager.cron.weekday.name` | `{weekday}` | 置換項目だけ |
| `schedule.manager.frequency.cronLocal` | `Cron {expression}` | Cron は式の名前。カタログ側と同じ |
| `schedule.manager.time.utcPrefix` | `UTC` | タイムゾーン名 UTC |
| `settings.account.onboardingBrand` | `DeepSeek Harness` | 製品名 |
| `settings.desktop.update.progress` | `{percent}%` | 百分率の書式 |
| `settings.desktop.update.versionDetail` | `{label}: {version}` | 語がない。コロンはほかの日本語と同じ半角 |
| `settings.models.baseUrlPlaceholder` | `{url}` | 置換項目だけ |
| `settings.models.customAnthropicBaseUrlPlaceholder` | `https://gateway.example` | 入力例の URL |
| `settings.models.customBaseUrlPlaceholder` | `https://gateway.example/v1` | 入力例の URL |
| `settings.models.protocolAnthropicMessages` | `Anthropic Messages` | プロトコル名。公式の中国語も同じ |
| `settings.models.protocolOpenAiCompletions` | `OpenAI Chat Completions` | プロトコル名。公式の中国語も同じ |
| `settings.models.protocolOpenAiResponses` | `OpenAI Responses` | プロトコル名。公式の中国語も同じ |
| `settings.theme.fontSize.unit` | `px` | 単位 px |
| `settings.webSearch.searchGuideUrl` | `https://api-docs.deepseek.com/guides/search` | リンク先の URL |
| `shortcuts.desktop-document` | `userData/keybindings.json` | 設定ファイルのパス |
| `sidebarImage.zoomValue` | `{percent}%` | 百分率の書式 |
| `sidebarPdf.title` | `PDF` | 形式名 PDF |
| `sidebarPdf.zoomValue` | `{percent}%` | 百分率の書式 |
| `subagent.tokens.million` | `{value}M` | 単位 M |
| `subagent.tokens.thousand` | `{value}K` | 単位 K |
| `trajectory.record.json` | `JSON` | 形式名 JSON |
| `trajectory.unit.milliseconds` | `{value} ms` | 単位 ms |
| `workflowRun.run.title` | `{name}` | 置換項目だけ |
| `workspace.date.ymd` | `{y}-{m}-{d}` | 年月日の書式。語がない |

`pluginMarket.sourcePlaceholder`、`pluginMarket.entryMeta`、`pluginMarket.entryMetaAuthor` は発見タブに出ます。訳さないのは、上の表の理由のとおり、語がなく置換項目か例の URL だけだからです。
