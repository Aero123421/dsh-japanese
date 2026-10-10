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
  await page.goto(`http://127.0.0.1:${server.address().port}/`)
  await page.getByRole('heading', { name: 'モデル', exact: true }).waitFor()
  assert.equal(await page.locator('html').getAttribute('lang'), 'ja')
  await page.evaluate(() => document.fonts.ready)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable')
  const { root } = await cdp.send('DOM.getDocument')
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#japanese-glyph-test' })
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId })
  assert.ok(fonts.length > 0 && fonts.every(font => font.isCustomFont), 'Japanese glyphs must use bundled fonts')
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
  await page.evaluate(() => testRuntime.locale.setLocale('ja'))
  await page.evaluate(() => testRuntime.unload())
  assert.equal(await page.locator('style[data-dsh-japanese]').count(), 0)
  assert.ok(!(await page.evaluate(() => testRuntime.locale.getSnapshot().locales)).some(locale => locale.id === 'ja'))
  assert.equal(await page.locator('html').getAttribute('lang'), 'en')
  await page.evaluate(() => testRuntime.dispose())
  assert.deepEqual(errors, [])
  console.log('Standalone Japanese: official locale/slots, translation, bundled font, user font preference, light/dark, narrow layout, language switching, and unload passed')
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)) }
