import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
import { compileOfficial } from './upstream.mjs'

await mkdir('artifacts', { recursive: true })
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
      const name = url.pathname.slice('/dsh-japanese/fonts/'.length)
      if (!/^noto-sans-jp-[0-9]+-wght-normal\.woff2$/.test(name)) { response.writeHead(404); response.end(); return }
      response.setHeader('content-type', 'font/woff2')
      response.end(await readFile(resolve('dist/fonts', name))); return
    }
    if (files.has(url.pathname)) {
      response.setHeader('content-type', url.pathname.endsWith('.css') ? 'text/css' : 'text/javascript')
      response.end(await readFile(files.get(url.pathname))); return
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
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } })
  const errors = []; page.on('pageerror', error => errors.push(error.message))
  const fontUrls = []
  page.on('request', request => { if (/\.woff2|fonts\.gstatic|fonts\.google/.test(request.url())) fontUrls.push(request.url()) })
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
  await page.evaluate(() => document.fonts.ready)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable')
  const { root } = await cdp.send('DOM.getDocument')
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#japanese-glyph-test' })
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId })
  assert.ok(fonts.length > 0 && fonts.every(font => font.isCustomFont), 'Japanese glyphs must use bundled fonts')
  assert.ok(fontUrls.length > 0 && fontUrls.every(url => url.startsWith(`http://127.0.0.1:${server.address().port}/dsh-japanese/fonts/`)), 'Japanese fonts must come from this host')
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
  assert.deepEqual(errors, [])
  console.log('Standalone Japanese: official locale/slots, translation, bundled font, user font preference, light/dark, narrow layout, language switching, and unload passed')
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)) }
