import { spawn } from 'node:child_process'
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { VERSION } from '../src/version.ts'
const requestedSource = process.argv[2] ?? '.'
const root = requestedSource.startsWith('github:') ? requestedSource : resolve(requestedSource)
const temp = await mkdtemp(join(tmpdir(), 'dsh-japanese-native-')), env = { ...process.env, DSH_HOME: join(temp, 'home') }
let server, browser, output = ''
const cleaned = value => value.replace(/https?:\/\/[^\s]*[?&]token=[^\s]*/g, '[authenticated URL]')
async function command(args) {
  const child = spawn('dsh', args, { cwd: temp, env, stdio: ['ignore', 'pipe', 'pipe'] })
  let captured = ''; child.stdout.on('data', chunk => { captured += chunk }); child.stderr.on('data', chunk => { captured += chunk })
  const code = await new Promise(resolve => child.on('exit', resolve))
  if (code !== 0) throw new Error(`DSH command failed (${code}): ${cleaned(captured).slice(-3000)}`)
}
try {
  await command(['plugin', '--profile', 'web', 'add', '-w', root])
  // Use the ordinary user patch in this private DSH_HOME to mark the pinned
  // welcome copy as acknowledged and skip unrelated credential onboarding.
  // Interactive dismissal races ConfigEditor-triggered reconnects.
  await writeFile(join(temp, 'home', 'cordis.patch.yml'), "- id: ui-settings-general\n  config:\n    welcomeNoticeVersion: '2026-09-28.1'\n- id: ui-settings-models\n  config:\n    credentialOnboarding: false\n")
  server = spawn('dsh', ['--profile', 'web', '--no-open', '--port', '0'], { cwd: temp, env, stdio: ['ignore', 'pipe', 'pipe'] })
  server.stdout.on('data', chunk => { output += chunk }); server.stderr.on('data', chunk => { output += chunk })
  let launch
  const deadline = Date.now() + 45_000
  while (Date.now() < deadline) {
    const candidate = output.match(/https?:\/\/127\.0\.0\.1:\d+\/[^\s]*/)?.[0]
    if (candidate && new URL(candidate).searchParams.has('token')) { launch = candidate; break }
    if (server.exitCode !== null) throw new Error(`DSH startup failed: ${cleaned(output).slice(-3000)}`)
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  if (!launch) throw new Error(`DSH startup did not become ready: ${cleaned(output).slice(-3000)}`)
  browser = await chromium.launch({ headless: true, ...process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {} })
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } })
  const errors = []; page.on('pageerror', error => errors.push(error.message))
  await page.goto(launch).catch(() => { throw new Error('Could not open the authenticated DSH page') })
  const api = async (method, payload = {}) => page.evaluate(async ({ method, payload }) => {
    const endpoint = `dsh-japanese-updates/${method}`
    const response = await fetch(`/api/${endpoint}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'client-request', rpcId: 'native-check', method: endpoint, payload }) })
    const result = (await response.json()).result
    if (!result.ok) throw new Error(result.error.code)
    return result.value
  }, { method, payload })
  const updateStatus = await api('update-status'); assert.equal(updateStatus.running, VERSION)
  assert.ok(['idle', 'unavailable'].includes(updateStatus.status))
  const settings = page.getByRole('button', { name: /^(Settings|设置)$/ })
  await settings.waitFor(); await settings.click()
  await page.getByRole('button', { name: 'Japanese pack', exact: true }).click()
  await page.getByRole('heading', { name: 'Japanese pack', exact: true }).waitFor()
  const row = page.locator('.dsh-japanese-update-page'); await row.waitFor()
  assert.equal(await row.count(), 1)
  assert.equal(await page.locator('style[data-dsh-japanese]').count(), 1)
  assert.equal(await page.locator('html').getAttribute('lang'), 'en')
  await page.evaluate(() => { document.body.style.setProperty('--dsh-font-family-text', 'serif'); document.body.style.setProperty('--dsh-font-family-code', 'monospace') })
  await mkdir('artifacts', { recursive: true }); await page.waitForFunction(() => !document.body.innerText.includes('Unable to create default workspace'), null, { timeout: 8000 }).catch(() => {})
  await page.screenshot({ path: 'artifacts/native-settings-en.png' })
  assert.match(await row.innerText(), new RegExp(VERSION.replaceAll('.', '\\.')))
  // Simulate authenticated wire results to exercise rendering and install deduplication
  // without asking the real profile manager to install a fictional release.
  let starts = 0, wireState = 'available'
  const candidate = { id: 'ui-fixture', version: '0.4.0', tag: 'v0.4.0', notes: 'Update fixture', url: 'https://github.com/Aero123421/dsh-japanese/releases/tag/v0.4.0', runtime: '0.2.1-alpha.2' }
  await page.route('**/api/dsh-japanese-updates/update-*', async route => {
    const request = route.request().postDataJSON()
    if (request.method.endsWith('update-install')) { starts++; wireState = 'restart-required' }
    const value = { profileKey: updateStatus.profileKey, status: request.method.endsWith('update-check') ? 'available' : wireState, running: VERSION, installed: wireState === 'restart-required' ? '0.4.0' : VERSION, candidate }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ type: 'server-response', rpcId: request.rpcId, result: { ok: true, value } }) })
  })
  await page.reload()
  await page.getByRole('button', { name: /^(Settings|设置)$/ }).click()
  await page.getByRole('button', { name: 'Japanese pack', exact: true }).click()
  await page.evaluate(() => { document.body.style.setProperty('--dsh-font-family-text', 'serif'); document.body.style.setProperty('--dsh-font-family-code', 'monospace') })
  await row.getByRole('button', { name: 'Update', exact: true }).click()
  await row.getByText('Restart DSH to use the installed version.', { exact: true }).waitFor()
  assert.equal(starts, 1)
  assert.equal(await page.locator('html').getAttribute('lang'), 'en')
  assert.equal(await page.evaluate(() => document.body.style.getPropertyValue('--dsh-font-family-text')), 'serif')
  assert.equal(await page.evaluate(() => document.body.style.getPropertyValue('--dsh-font-family-code')), 'monospace')
  await page.reload()
  await page.getByRole('button', { name: /^(Settings|设置)$/ }).click()
  await page.getByRole('button', { name: 'Japanese pack', exact: true }).click()
  await row.getByText('Restart DSH to use the installed version.', { exact: true }).waitFor()
  assert.equal(starts, 1)
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await row.evaluate(element => element.scrollWidth <= element.clientWidth), true)
  await page.screenshot({ path: 'artifacts/native-update-narrow.png', animations: 'disabled' })
  assert.deepEqual(errors, [])
  console.log('Isolated dsh Web: native installation, authenticated updater API/UI, bundled font/style, unchanged English/text/code fonts, restart result, reconnect without reinstallation passed')
} finally {
  await browser?.close()
  if (server && server.exitCode === null) { server.kill('SIGTERM'); await new Promise(resolve => { const timer = setTimeout(() => { server.kill('SIGKILL') }, 3000); server.once('exit', () => { clearTimeout(timer); resolve() }) }) }
  await rm(temp, { recursive: true, force: true })
}
