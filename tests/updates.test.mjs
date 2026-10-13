import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile, mkdir, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { createHash, randomUUID } from 'node:crypto'
import { Updates, getCandidate, PACKAGE, REPOSITORY, supportsSource } from '../src/updates.ts'
import { boundedFetch } from '../src/update-download.ts'
import { UpdateController } from '../src/update-controller.ts'
const runtime = '0.2.1-alpha.2'
const version = '0.4.0', tag = 'v'+version, filename = `local-dsh-japanese-${version}.tgz`
function archive(value) {
  const body = Buffer.from(JSON.stringify(value)), header = Buffer.alloc(512)
  header.write('package/package.json'); header.write('0000644\0', 100); header.write('0000000\0', 108); header.write('0000000\0', 116)
  header.write(body.length.toString(8).padStart(11, '0')+'\0', 124); header.write('00000000000\0', 136); header.fill(32, 148, 156); header[156] = 48
  header.write('ustar\0', 257); header.write('00', 263)
  const checksum = header.reduce((sum, byte) => sum+byte, 0); header.write(checksum.toString(8).padStart(6,'0')+'\0 ',148)
  return gzipSync(Buffer.concat([header, body, Buffer.alloc((512-body.length%512)%512+1024)]))
}
const release = () => ({ id: 2, tag_name: tag, draft: false, prerelease: false, body: 'Release notes', html_url: `https://github.com/${REPOSITORY}/releases/tag/${tag}`, assets: [filename, 'SHA256SUMS'].map((name, i) => ({ id: i+1, name, size: 10, browser_download_url: `https://github.com/${REPOSITORY}/releases/download/${tag}/${name}` })) })
const manifest = () => ({ name: PACKAGE, version, dsh: { bundle: { patch: './cordis.patch.yml' } }, peerDependencies: { '@deepseek-ai/dsh-web': runtime } })
const bytes = archive(manifest())
function fetcher(releaseValue = release(), manifestValue = manifest()) {
  return async url => String(url).endsWith('releases/latest') ? Response.json(releaseValue) : String(url).endsWith('package.json') ? Response.json(manifestValue) : String(url).endsWith('SHA256SUMS') ? new Response(`${createHash('sha256').update(bytes).digest('hex')}  ${filename}\n`) : new Response(bytes)
}
async function fixture(t, options = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'search-updates-test-')); t.after(() => rm(dir, { recursive: true, force: true }))
  const bundle = { name: PACKAGE, enabled: false, installed: true, version: '0.2.0', source: `github:${REPOSITORY}#v0.2.0`, ...options.bundle }
  if (bundle.source.startsWith('file:/downloads/')) {
    const path = join(dir, bundle.source.slice('file:/downloads/'.length))
    await writeFile(path, bytes); bundle.source = `file:${path}`
  }
  const calls = []
  const manager = { listBundles: async () => [bundle], waitForInstall: async () => null, installBundle: async (spec, config) => { calls.push({ spec, config }); bundle.version = version; if (!spec.startsWith('github:')) bundle.source = `file:${spec}`; return { changed: true, application: 'restart-required', stage: 'install', target: spec, version, bundle: PACKAGE, ...options.result } }, ...options.manager }
  const updates = new Updates(() => manager, dir, '0.2.0', runtime, options.fetcher ?? fetcher())
  return { dir, bundle, calls, manager, updates }
}
test('Strict official metadata, channel, SemVer and compatibility', async () => {
  assert.equal((await getCandidate(runtime, fetcher())).version, version)
  for (const bad of [{ ...release(), draft: true }, { ...release(), prerelease: true }, { ...release(), tag_name: 'v00.4.0' }, { ...release(), html_url: 'https://example.com' }, { ...release(), assets: [...release().assets, release().assets[0]] }]) await assert.rejects(getCandidate(runtime, fetcher(bad)))
  await assert.rejects(getCandidate(runtime, fetcher(release(), { ...manifest(), name: 'other' })), /metadata/)
  await assert.rejects(getCandidate('0.2.2', fetcher()), /incompatible/)
  assert.equal(supportsSource(`github:${REPOSITORY}#v0.2.0`), true)
  assert.equal(supportsSource('github:other/plugin'), false)
})
test('Disabled bundle stays disabled; pin remains explicit; restart is not success; journal survives reload', async t => {
  const { updates, manager, dir, calls } = await fixture(t)
  const checked = await updates.check(), id = randomUUID()
  assert.equal(checked.status, 'available')
  const result = await updates.install(checked.candidate.id, id)
  assert.equal(result.status, 'restart-required'); assert.equal(calls.length, 1)
  assert.equal(calls[0].config.enabled, false); assert.equal(calls[0].config.requestId, id)
  assert.equal(calls[0].spec, `github:${REPOSITORY}#${tag}`)
  await updates.install(checked.candidate.id, id); assert.equal(calls.length, 1)
  const restarted = new Updates(() => manager, dir, version, runtime, fetcher())
  assert.equal((await restarted.status()).status, 'applied')
})
test('Failure, cancellation, override and incorrect manifest version are never success', async t => {
  for (const application of ['failed', 'cancelled', 'overridden', 'applied']) {
    const { updates } = await fixture(t, { result: { application, ...(application === 'applied' ? { version: '9.0.0' } : {}) } })
    const checked = await updates.check()
    const result = await updates.install(checked.candidate.id, randomUUID())
    assert.equal(result.status, application === 'applied' ? 'unknown' : application)
  }
})
test('Installer transport loss and null wait result remain unknown and never resend', async t => {
  let installs = 0
  const { updates, dir, manager } = await fixture(t, { manager: { installBundle: async () => { installs++; throw new Error('lost') } } })
  const checked = await updates.check(), id = randomUUID()
  assert.equal((await updates.install(checked.candidate.id, id)).status, 'unknown')
  const reconnect = new Updates(() => manager, dir, '0.2.0', runtime, fetcher())
  assert.equal((await reconnect.status()).status, 'unknown')
  await reconnect.install(checked.candidate.id, id); assert.equal(installs, 1)
})
test('Optional manager, read-only, unsupported source do not fetch or install', async t => {
  const { updates } = await fixture(t, { bundle: { readOnlyReason: 'management-required' }, fetcher: async () => { throw new Error('should not fetch') } })
  assert.equal((await updates.status()).status, 'unavailable')
  assert.equal((await new Updates(() => undefined, undefined, '0.2.0', runtime).status()).status, 'unavailable')
  const unsupported = await fixture(t, { bundle: { source: 'file:/random/local.tgz' }, fetcher: async () => { throw new Error('should not fetch') } })
  assert.equal((await unsupported.updates.status()).reason, 'source-unsupported')
})
test('Tarball route verifies digest, preserves disabled state, and uses retained verified file', async t => {
  const { updates, calls } = await fixture(t, { bundle: { source: `https://github.com/${REPOSITORY}/releases/download/v0.2.0/local-dsh-japanese-0.2.0.tgz` } })
  const checked = await updates.check()
  assert.equal((await updates.install(checked.candidate.id, randomUUID())).status, 'restart-required')
  assert.match(calls[0].spec, /\.dsh-japanese-update\/verified-.*\.tgz$/)
  assert.equal(calls[0].config.enabled, false)
})
test('Checksum failure is recorded as failure before manager is invoked', async t => {
  const normal = fetcher()
  const { updates, calls } = await fixture(t, { bundle: { source: `https://github.com/${REPOSITORY}/releases/download/v0.2.0/local-dsh-japanese-0.2.0.tgz` }, fetcher: url => String(url).endsWith('SHA256SUMS') ? Promise.resolve(new Response('invalid')) : normal(url) })
  const checked = await updates.check()
  assert.equal((await updates.install(checked.candidate.id, randomUUID())).status, 'failed')
  assert.equal(calls.length, 0); assert.equal((await updates.status()).status, 'failed')
})
test('Redirects, oversized streams and HTTP errors fail closed', async () => {
  const url = `https://github.com/${REPOSITORY}/releases/download/${tag}/${filename}`
  await assert.rejects(boundedFetch(url, 10, { fetcher: async () => new Response(null, { status: 302, headers: { location: 'https://evil.example/payload' } }) }), /redirect/)
  await assert.rejects(boundedFetch(url, 2, { fetcher: async () => new Response('long') }), /size/)
  await assert.rejects(boundedFetch(url, 20, { fetcher: async () => new Response('', { status: 404 }) }), /release-unavailable/)
})
test('Client reset discards old response and reconciles without repeating install', async () => {
  const requests = []
  const controller = new UpdateController({ rpc: { call: (_base, method, payload) => new Promise(resolve => requests.push({ method, payload, resolve })) } })
  const first = controller.status()
  requests[0].resolve({ ok: true, value: { status: 'available', running: '0.2.0', candidate: { id: 'candidate', version, url: `https://github.com/${REPOSITORY}/releases/tag/${tag}`, runtime, notes: '' } } }); await first
  const install = controller.install(); const duplicate = controller.install(); await duplicate
  controller.reset()
  assert.equal(requests[2].method, 'dsh-japanese-updates/update-status')
  requests[2].resolve({ ok: true, value: { status: 'restart-required', running: '0.2.0' } }); await new Promise(resolve => setImmediate(resolve))
  requests[1].resolve({ ok: true, value: { status: 'applied', running: version } }); await install
  assert.equal(controller.getSnapshot().status, 'restart-required')
  assert.equal(requests.filter(request => request.method.endsWith('update-install')).length, 1)
  controller.dispose()
})
test('A failed preparation can be checked and retried with a new operation', async t => {
  let bad = true
  const normal = fetcher()
  const { updates, calls } = await fixture(t, { bundle: { source: 'file:/downloads/local-dsh-japanese-0.2.0.tgz' }, fetcher: url => bad && String(url).endsWith('SHA256SUMS') ? Promise.resolve(new Response('invalid')) : normal(url) })
  const first = await updates.check()
  assert.equal((await updates.install(first.candidate.id, randomUUID())).status, 'failed')
  bad = false
  const second = await updates.check()
  assert.equal((await updates.install(second.candidate.id, randomUUID())).status, 'restart-required')
  assert.equal(calls.length, 1)
})
test('Disabling the plugin during preparation prevents later installer invocation', async t => {
  const normal = fetcher(); let waiting, releaseDownload
  const started = new Promise(resolve => { waiting = resolve })
  const { updates, calls } = await fixture(t, { bundle: { source: 'file:/downloads/local-dsh-japanese-0.2.0.tgz' }, fetcher: async url => {
    if (String(url).endsWith(filename)) { waiting(); await new Promise(resolve => { releaseDownload = resolve }) }
    return normal(url)
  } })
  const checked = await updates.check(), installing = updates.install(checked.candidate.id, randomUUID())
  await started; updates.dispose(); releaseDownload(); await installing
  assert.equal(calls.length, 0)
})
test('Another Client cannot settle an unresolved operation or start a second installation', async t => {
  let installs = 0
  const { updates, dir, manager } = await fixture(t, { manager: { installBundle: async () => { installs++; throw new Error('lost manager result') } } })
  const checked = await updates.check(), firstId = randomUUID()
  assert.equal((await updates.install(checked.candidate.id, firstId)).status, 'unknown')
  const second = new Updates(() => manager, dir, '0.2.0', runtime, fetcher())
  assert.equal((await second.install(checked.candidate.id, randomUUID())).status, 'unknown')
  const third = new Updates(() => manager, dir, '0.2.0', runtime, fetcher())
  assert.equal((await third.status()).status, 'unknown')
  assert.equal((await third.check()).status, 'unknown')
  assert.equal((await third.install(checked.candidate.id, randomUUID())).status, 'unknown')
  assert.equal(installs, 1)
  assert.equal((await updates.status()).operation, firstId)
})
test('A busy install rejects another operation ID and a check cannot masquerade as an install', async t => {
  let settle, begun
  const start = new Promise(resolve => { begun = resolve })
  const { updates } = await fixture(t, { manager: { installBundle: async () => { begun(); return new Promise(resolve => { settle = resolve }) } } })
  const checked = await updates.check()
  const first = updates.install(checked.candidate.id, randomUUID()); await start
  await assert.rejects(updates.install(checked.candidate.id, randomUUID()), /busy/)
  settle({ changed: false, application: 'failed', stage: 'install', target: PACKAGE }); await first
})
test('Matching checksums never admit an archive with the wrong package, version or DSH peers', async t => {
  for (const value of [{ ...manifest(), name: 'wrong-package' }, { ...manifest(), version: '0.2.0' }, { ...manifest(), peerDependencies: { '@deepseek-ai/dsh-web': '99.0.0' } }]) {
    const wrong = archive(value), normal = fetcher()
    const { updates, calls } = await fixture(t, { bundle: { source: 'file:/downloads/local-dsh-japanese-0.2.0.tgz' }, fetcher: async url => String(url).endsWith('SHA256SUMS') ? new Response(`${createHash('sha256').update(wrong).digest('hex')}  ${filename}\n`) : String(url).endsWith(filename) ? new Response(wrong) : normal(url) })
    const checked = await updates.check()
    assert.equal((await updates.install(checked.candidate.id, randomUUID())).status, 'failed')
    assert.equal(calls.length, 0)
  }
})
test('A busy refusal clears the unadmitted Client ID before reconciling the Host operation', async () => {
  let count = 0
  const controller = new UpdateController({ rpc: { call: async (_base, method, payload) => {
    count++
    if (method.endsWith('update-install')) return { ok: false, error: { code: 'dsh-japanese/busy' } }
    if (count > 2) assert.equal(payload.operationId, undefined)
    return { ok: true, value: { status: 'available', running: '0.2.0', candidate: { id: 'fixture', version, url: `https://github.com/${REPOSITORY}/releases/tag/${tag}`, runtime, notes: '' } } }
  } } })
  await controller.status(); await controller.install(); assert.equal(controller.getSnapshot().status, 'failed'); await controller.status(); controller.dispose()
})
test('Dispose during the final asynchronous bundle lookup cannot invoke the installer', async t => {
  let calls = 0, releaseLookup, finalLookup
  const ready = new Promise(resolve => { finalLookup = resolve })
  const bundle = { name: PACKAGE, installed: true, enabled: false, version: '0.2.0', source: `github:${REPOSITORY}#v0.2.0` }
  const { updates } = await fixture(t, { manager: { listBundles: async () => {
    calls++; if (calls === 4) { finalLookup(); await new Promise(resolve => { releaseLookup = resolve }) } return [bundle]
  }, installBundle: async () => { throw new Error('Installer must not be invoked') } } })
  const checked = await updates.check(), installing = updates.install(checked.candidate.id, randomUUID())
  await ready; updates.dispose(); releaseLookup()
  assert.equal((await installing).status, 'failed')
})
test('A released-name local directory or symbolic link is not a tarball installation', async t => {
  const { dir, updates, bundle } = await fixture(t)
  const directory = join(dir, 'directory', 'local-dsh-japanese-0.2.0.tgz')
  await mkdir(directory, { recursive: true }); bundle.source = `file:${directory}`
  assert.equal((await updates.status()).reason, 'source-unsupported')
  const target = join(dir, 'archive.tgz'), link = join(dir, 'local-dsh-japanese-0.2.0.tgz')
  await writeFile(target, bytes); await symlink(target, link); bundle.source = `file:${link}`
  assert.equal((await updates.status()).reason, 'source-unsupported')
})
