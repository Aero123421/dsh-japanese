import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { compileOfficial } from './upstream.mjs'
import { fontFileName } from '../src/fonts.mjs'

await mkdir('artifacts', { recursive: true })
const reviewDirectory = resolve('artifacts/pr-11-ui')
await mkdir(reviewDirectory, { recursive: true })
const reviewSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const baselineClient = process.env.PR11_BASELINE_CLIENT ? resolve(process.env.PR11_BASELINE_CLIENT) : undefined
const baselineSha = process.env.PR11_BASELINE_SHA ?? 'unknown'
const uiEvidence = []
await compileOfficial('scripts/browser-fixture.jsx', '.cache/browser-fixture.js', 'browser')
const files = new Map([
  ['/fixture.js', resolve('.cache/browser-fixture.js')], ['/plugin.js', resolve('dist/client.js')],
  ['/base.css', resolve('.cache/upstream/packages/client/ui-theme/src/styles/base.css')],
  ['/tokens.css', resolve('.cache/upstream/packages/client/ui-theme/src/styles/design-platform.css')],
])
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1')
    if (url.pathname.startsWith('/dsh-japanese/fonts/')) {
      const name = fontFileName(url.pathname)
      if (!name) { response.writeHead(404); response.end(); return }
      response.setHeader('content-type', 'font/woff2')
      response.end(await readFile(resolve('dist/fonts', name))); return
    }
    if (files.has(url.pathname)) {
      response.setHeader('content-type', url.pathname.endsWith('.css') ? 'text/css' : 'text/javascript')
      const useBaseline = url.pathname === '/plugin.js' && baselineClient && request.headers.referer?.includes('before=1')
      response.end(await readFile(useBaseline ? baselineClient : files.get(url.pathname))); return
    }
    response.setHeader('content-type', 'text/html')
    response.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="/tokens.css"><link rel="stylesheet" href="/base.css"><style>body{margin:0;background:var(--dsw-alias-bg-layer-1)}</style></head><body><div id="app"></div><script src="/fixture.js"></script><script src="/plugin.js"></script><script>mountPlugin()</script></body></html>')
  } catch { response.writeHead(500); response.end('test fixture failed') }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
let browser
try {
  const options = { headless: true }
  if (process.env.DSH_TEST_CHROMIUM) options.executablePath = process.env.DSH_TEST_CHROMIUM
  browser = await chromium.launch(options)
  const capture = async (page, name, state, locale, theme, codeSha = reviewSha) => {
    const path = resolve(reviewDirectory, `${name}.png`)
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    await page.locator('.dsh-japanese-update-page').screenshot({ path })
    const viewport = page.viewportSize()
    uiEvidence.push({ image: `artifacts/pr-11-ui/${name}.png`, state, viewport, locale, theme, environment: 'local Chromium; official UI fixture with mocked RPC; not live DSH', codeSha, targetSha: reviewSha })
  }
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } })
  const errors = []; page.on('pageerror', error => errors.push(error.message))
  const fontUrls = []
  const fontStatuses = []
  page.on('request', request => { if (/\.woff2|fonts\.gstatic|fonts\.google/.test(request.url())) fontUrls.push(request.url()) })
  page.on('response', response => { if (response.url().includes('/dsh-japanese/fonts/')) fontStatuses.push(response.status()) })
  const english = await browser.newPage()
  const englishFonts = []
  english.on('request', request => { if (/\.woff2|fonts\.gstatic|fonts\.google/.test(request.url())) englishFonts.push(request.url()) })
  const englishErrors = []
  english.on('pageerror', error => englishErrors.push(error.message))
  await english.goto(`http://127.0.0.1:${server.address().port}/?lang=en`)
  await english.locator('#japanese-glyph-test').waitFor()
  await english.evaluate(() => document.fonts.ready)
  assert.equal(await english.locator('html').getAttribute('lang'), 'en')
  assert.deepEqual(englishFonts, [])
  assert.deepEqual(englishErrors, [])
  await english.close()
  await page.goto(`http://127.0.0.1:${server.address().port}/`)
  await page.getByRole('heading', { name: 'モデル', exact: true }).waitFor()
  const updatePage = page.locator('.dsh-japanese-update-page'); await updatePage.waitFor()
  await updatePage.getByText('この構成では自動更新できません。', { exact: false }).waitFor()
  assert.equal(await updatePage.getByRole('button', { name: '更新を確認', exact: true }).isDisabled(), true)
  assert.equal(await page.locator('html').getAttribute('lang'), 'ja')
  await page.evaluate(() => testRuntime.setUpdate('incompatible', 'incompatible', { 'engines.dsh': '>=0.2.2 <0.3.0-0' }))
  await updatePage.getByText('engines.dsh >=0.2.2 <0.3.0-0').waitFor({ timeout: 5000 })
  assert.equal(await updatePage.getByRole('button', { name: '更新する', exact: true }).count(), 0)
  assert.equal(await page.evaluate(() => testRuntime.installs()), 0)
  await page.setViewportSize({ width: 390, height: 760 })
  assert.equal(await updatePage.evaluate(element => element.scrollWidth <= element.clientWidth), true)
  await page.setViewportSize({ width: 1000, height: 800 })
  await page.evaluate(() => document.fonts.ready)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable')
  const { root } = await cdp.send('DOM.getDocument')
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#japanese-glyph-test' })
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId })
  assert.ok(fonts.length > 0 && fonts.every(font => font.isCustomFont), 'Japanese glyphs must use bundled fonts')
  assert.ok(fontUrls.length > 0 && fontUrls.every(url => url.startsWith(`http://127.0.0.1:${server.address().port}/dsh-japanese/fonts/`)), 'Japanese fonts must come from this host')
  assert.ok(fontStatuses.length > 0 && fontStatuses.every(status => status === 200), 'Japanese font responses must be 200')
  assert.ok(fontUrls.some(url => url.endsWith('/noto-sans-jp-latin-wght-normal.woff2')))
  await page.screenshot({ path: 'artifacts/japanese-light.png' })
  await page.evaluate(() => document.body.setAttribute('data-ds-dark-theme', ''))
  await page.screenshot({ path: 'artifacts/japanese-dark.png' })
  await page.evaluate(() => document.body.style.setProperty('--dsh-font-family-text', 'serif'))
  assert.ok((await page.locator('#japanese-glyph-test').evaluate(node => getComputedStyle(node).fontFamily)).startsWith('serif'))
  await page.evaluate(() => document.body.style.removeProperty('--dsh-font-family-text'))
  await page.setViewportSize({ width: 390, height: 760 })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await page.evaluate(() => testRuntime.locale.setLocale('en'))
  assert.equal(await page.locator('html').getAttribute('lang'), 'en')
  assert.ok(!(await page.locator('#japanese-glyph-test').evaluate(node => getComputedStyle(node).fontFamily)).includes('DSH Japanese UI'))
  await page.evaluate(() => { document.body.style.setProperty('--dsh-font-family-text', 'serif'); document.body.style.setProperty('--dsh-font-family-code', 'monospace') })
  await page.evaluate(() => testRuntime.setUpdate('available'))
  await updatePage.getByRole('button', { name: 'Update', exact: true }).click()
  await updatePage.getByText('Restart DSH to use the installed version.', { exact: false }).waitFor()
  assert.equal(await page.evaluate(() => testRuntime.installs()), 1)
  assert.equal(await page.locator('html').getAttribute('lang'), 'en')
  assert.equal(await page.evaluate(() => document.body.style.getPropertyValue('--dsh-font-family-text')), 'serif')
  assert.equal(await page.evaluate(() => document.body.style.getPropertyValue('--dsh-font-family-code')), 'monospace')
  await page.evaluate(() => testRuntime.setUpdate('unknown'))
  await updatePage.getByRole('button', { name: 'Check result', exact: true }).click()
  assert.equal(await page.evaluate(() => testRuntime.installs()), 1)
  await page.evaluate(() => testRuntime.locale.setLocale('ja'))
  assert.equal(await updatePage.evaluate(element => element.scrollWidth <= element.clientWidth), true)
  await page.screenshot({ path: 'artifacts/update-ja-narrow.png' })
  await page.setViewportSize({ width: 1000, height: 800 })
  await page.evaluate(() => { document.body.removeAttribute('data-ds-dark-theme'); return testRuntime.setUpdate('failed', 'restore-failed') })
  await updatePage.getByText('以前の版も戻せませんでした', { exact: false }).waitFor()
  await updatePage.getByText('dsh plugin --profile web add -w github:Aero123421/dsh-japanese', { exact: true }).waitFor()
  await updatePage.getByText('github:Aero123421/dsh-japanese を入れ直してください', { exact: false }).waitFor()
  await page.screenshot({ path: 'artifacts/restore-failed-ja-light.png' })
  await updatePage.screenshot({ path: 'artifacts/restore-failed-ja-light-panel.png' })
  await page.evaluate(() => document.body.setAttribute('data-ds-dark-theme', ''))
  await page.screenshot({ path: 'artifacts/restore-failed-ja-dark.png' })
  await updatePage.screenshot({ path: 'artifacts/restore-failed-ja-dark-panel.png' })
  await page.setViewportSize({ width: 390, height: 760 })
  assert.equal(await updatePage.evaluate(element => element.scrollWidth <= element.clientWidth), true)
  await page.screenshot({ path: 'artifacts/restore-failed-ja-narrow.png' })
  await updatePage.screenshot({ path: 'artifacts/restore-failed-ja-narrow-panel.png' })
  await page.evaluate(() => testRuntime.locale.setLocale('en'))
  await updatePage.getByText('previous version could not be restored', { exact: false }).waitFor()
  await page.evaluate(() => testRuntime.locale.setLocale('ja'))
  await page.evaluate(() => testRuntime.unload())
  assert.equal(await page.locator('style[data-dsh-japanese]').count(), 0)
  assert.equal(await page.locator('style[data-dsh-japanese-updates]').count(), 0)
  assert.equal(await updatePage.count(), 0)
  assert.ok(!(await page.evaluate(() => testRuntime.locale.getSnapshot().locales)).some(locale => locale.id === 'ja'))
  assert.equal(await page.locator('html').getAttribute('lang'), 'en')
  await page.evaluate(() => testRuntime.dispose())
  const optional = await browser.newPage()
  await optional.goto(`http://127.0.0.1:${server.address().port}/?no-connection=1`)
  await optional.getByRole('heading', { name: 'モデル', exact: true }).waitFor()
  assert.equal(await optional.locator('style[data-dsh-japanese]').count(), 1)
  assert.equal(await optional.locator('.dsh-japanese-update-page').count(), 0)
  assert.equal(await optional.locator('html').getAttribute('lang'), 'ja')
  await optional.evaluate(() => testRuntime.dispose()); await optional.close()

  // Exercise the affected settings page across meaningful states and record
  // pixel screenshots on the reviewed head. All RPC and profile data are fake.
  const qa = await browser.newPage({ viewport: { width: 1000, height: 800 } })
  await qa.goto(`http://127.0.0.1:${server.address().port}/`)
  const panel = qa.locator('.dsh-japanese-update-page')
  await panel.waitFor()
  const setState = async (status, reason = '', requirements, notes) => {
    await qa.evaluate(([nextStatus, nextReason, nextRequirements, nextNotes]) => testRuntime.setUpdate(nextStatus, nextReason, nextRequirements, nextNotes), [status, reason, requirements, notes])
  }
  const saveState = async (name, status, locale = 'ja', theme = 'light') => {
    await panel.getByText(status, { exact: false }).waitFor({ timeout: 5000 })
    await capture(qa, name, status, locale, theme)
  }
  await setState('idle'); await saveState('01-idle-empty-ja-light-wide', '更新は未確認です。')
  await setState('checking'); await saveState('02-checking-ja-light-wide', '更新を確認中…')
  const longNotes = Array.from({ length: 18 }, (_, index) => `更新ノート ${index + 1}: 日本語の変更点と確認手順。`).join('\n')
  await setState('available', '', undefined, longNotes)
  await saveState('03-available-long-notes-ja-light-wide', '更新があります。')
  assert.equal(await panel.getByRole('button', { name: '更新する', exact: true }).isEnabled(), true)
  await setState('installing'); await saveState('04-installing-ja-light-wide', 'インストール中…')
  await setState('failed', 'checksum'); await saveState('05-failed-checksum-ja-light-wide', 'チェックサムが一致しません。')
  await setState('cancelled'); await saveState('06-cancelled-ja-light-wide', 'インストールは取り消されました。')
  await setState('unknown'); await saveState('07-unknown-reconnect-ja-light-wide', '結果が不明です。')
  assert.equal(await panel.getByRole('button', { name: '結果を確認', exact: true }).count(), 1)
  const longRequirements = Object.fromEntries(Array.from({ length: 7 }, (_, index) => [`engines.dsh.rule-${index + 1}`, `>=0.${index + 2}.0 <0.${index + 3}.0-0 prerelease-required`]))
  await setState('incompatible', 'incompatible', longRequirements)
  await saveState('08-incompatible-long-requirements-ja-light-wide', 'このリリースは使用中のDSHに対応していません。')
  const incompatibleLabel = 'このリリースは使用中のDSHに対応していません。'
  assert.equal(((await panel.getByRole('status').textContent()).match(new RegExp(incompatibleLabel, 'g')) ?? []).length, 1)
  assert.equal(await panel.getByRole('button', { name: '更新する', exact: true }).count(), 0)
  assert.equal(await panel.getByRole('button', { name: '更新を確認', exact: true }).isEnabled(), true)
  await qa.setViewportSize({ width: 390, height: 760 })
  assert.equal(await panel.evaluate(element => element.scrollWidth <= element.clientWidth), true)
  assert.equal(await qa.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await capture(qa, '09-incompatible-long-requirements-ja-light-mobile', 'incompatible with long requirement list', 'ja', 'light')
  await qa.evaluate(() => document.body.setAttribute('data-ds-dark-theme', ''))
  await capture(qa, '10-incompatible-ja-dark-mobile', 'incompatible with long requirement list', 'ja', 'dark')
  await qa.setViewportSize({ width: 1000, height: 800 })
  await qa.evaluate(() => testRuntime.locale.setLocale('en'))
  await panel.getByText('This release does not support your DSH version.', { exact: false }).waitFor()
  await capture(qa, '11-incompatible-en-dark-wide', 'incompatible with long requirement list', 'en', 'dark')
  await qa.evaluate(() => { testRuntime.locale.setLocale('ja'); document.body.removeAttribute('data-ds-dark-theme') })
  await panel.getByText('このリリースは使用中のDSHに対応していません。', { exact: false }).waitFor()
  await setState('failed', 'checksum')
  await qa.evaluate(() => testRuntime.setNextCheckReply('available', '', undefined, '再試行後の更新情報'))
  await panel.getByRole('button', { name: '更新を確認', exact: true }).click()
  await panel.getByText('更新があります。', { exact: false }).waitFor()
  await capture(qa, '12-retry-available-ja-light-wide', 'failed then user-triggered check succeeded', 'ja', 'light')
  await setState('restart-required'); await saveState('13-restart-required-ja-light-wide', '導入版を使うにはDSHを再起動してください。')
  await setState('applied'); await saveState('14-applied-ja-light-wide', '実行版の反映を確認しました。')
  await qa.evaluate(() => testRuntime.dispose()); await qa.close()

  // Compare the old and reviewed clients through the exact same mocked
  // pre-admission refusal and connection reset. Old client retains its ID and
  // renders unknown; the reviewed client clears it and remains actionable.
  const preAdmission = async (before) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 760 } })
    await page.goto(`http://127.0.0.1:${server.address().port}/?lang=ja${before ? '&before=1' : ''}`)
    const updatePanel = page.locator('.dsh-japanese-update-page')
    await updatePanel.waitFor()
    await page.evaluate(() => testRuntime.setUpdate('available'))
    await updatePanel.getByRole('button', { name: '更新する', exact: true }).waitFor()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    assert.equal(await updatePanel.evaluate(element => element.scrollWidth <= element.clientWidth), true)
    await page.evaluate(() => testRuntime.setNextInstallReply('incompatible', 'incompatible', { 'engines.dsh': '>=0.2.2 <0.3.0-0' }))
    await updatePanel.getByRole('button', { name: '更新する', exact: true }).click()
    await updatePanel.getByText('engines.dsh >=0.2.2 <0.3.0-0', { exact: false }).waitFor()
    const prefix = before ? '15-before' : '16-after'
    await capture(page, `${prefix}-unadmitted-incompatible-mobile`, 'pre-admission incompatible before reconnect', 'ja', 'light', before ? baselineSha : reviewSha)
    await page.evaluate(() => testRuntime.reconnect())
    await page.waitForFunction(() => {
      const statusRequest = testRuntime.requests().filter(request => request.method.endsWith('update-status')).at(-1)
      return statusRequest?.settled === true
    })
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const afterText = before ? '結果が不明です。' : 'このリリースは使用中のDSHに対応していません。'
    await updatePanel.getByText(afterText, { exact: false }).waitFor({ timeout: 5000 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    if (before) {
      assert.equal(await updatePanel.getByRole('button', { name: '更新を確認', exact: true }).isDisabled(), true)
      assert.equal((await page.evaluate(() => testRuntime.requests())).filter(request => request.method.endsWith('update-status') && request.operationId).length > 0, true)
      await capture(page, '17-before-reconnect-unknown-mobile', 'reconnected with stale expected ID; check disabled', 'ja', 'light', baselineSha)
    } else {
      assert.equal(await updatePanel.getByRole('button', { name: '更新を確認', exact: true }).isEnabled(), true)
      assert.equal((await page.evaluate(() => testRuntime.requests())).some(request => request.method.endsWith('update-status') && request.operationId), false)
      const incompatibleLabel = 'このリリースは使用中のDSHに対応していません。'
      assert.equal(((await updatePanel.getByRole('status').textContent()).match(new RegExp(incompatibleLabel, 'g')) ?? []).length, 1)
      await capture(page, '18-after-reconnect-incompatible-mobile', 'reconnected after unadmitted refusal; check enabled', 'ja', 'light', reviewSha)
    }
    await page.evaluate(() => { localStorage.clear(); return testRuntime.dispose() }); await page.close()
  }
  if (baselineClient) {
    await preAdmission(true)
  }
  await preAdmission(false)
  await writeFile(resolve(reviewDirectory, 'manifest.json'), JSON.stringify({ targetSha: reviewSha, baselineSha: baselineClient ? baselineSha : null, environment: 'local Chromium; official UI fixture with mocked RPC; no live DSH or account data', screenshots: uiEvidence }, null, 2) + '\n')
  assert.deepEqual(errors, [])
  console.log(`Standalone Japanese and update UI passed; captured ${uiEvidence.length} PR #11 state screenshots in ${reviewDirectory}`)
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)) }
