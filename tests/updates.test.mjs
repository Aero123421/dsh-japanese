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
import { en, ja } from '../src/update-copy.mjs'
const PROFILE_KEY = 'a'.repeat(64)
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
  const updates = new Updates(() => manager, dir, '0.2.0', runtime, options.fetcher ?? fetcher(), options.schedule, options.evaluate)
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
test('engines.dsh decides alone and dsh peers apply only when it is absent, like app-boot', async () => {
  // The issue fixture: peers accept the runtime while an own engines.dsh range rejects it.
  await assert.rejects(getCandidate(runtime, fetcher(release(), { ...manifest(), engines: { dsh: '>=0.2.2 <0.3.0-0' }, peerDependencies: { '@deepseek-ai/dsh': '>=0.2.1-alpha.2 <0.3.0-0' } })), /incompatible/)
  // The reverse: engines accepts the runtime while a peer demands newer, and peers stay ignored.
  assert.equal((await getCandidate(runtime, fetcher(release(), { ...manifest(), engines: { dsh: '>=0.2.1-alpha.2 <0.3.0-0' }, peerDependencies: { '@deepseek-ai/dsh': '>=0.2.2 <0.3.0-0' } }))).version, version)
  // An engines-only declaration decides both ways instead of staying peer-unknown.
  assert.equal((await getCandidate(runtime, fetcher(release(), { ...manifest(), peerDependencies: {}, engines: { dsh: '>=0.2.1-alpha.2 <0.3.0-0' } }))).version, version)
  await assert.rejects(getCandidate(runtime, fetcher(release(), { ...manifest(), peerDependencies: {}, engines: { dsh: '>=0.2.2 <0.3.0-0' } })), /incompatible/)
  // A manifest without any dsh requirement is loadable, exactly as app-boot loads it without a warning.
  assert.equal((await getCandidate(runtime, fetcher(release(), { ...manifest(), peerDependencies: { react: '^18' } }))).version, version)
  // Only engines.dsh takes priority; an engines.node key never does.
  assert.equal((await getCandidate(runtime, fetcher(release(), { ...manifest(), engines: { node: '>=22' }, peerDependencies: { '@deepseek-ai/dsh-web': runtime } }))).version, version)
  // Prereleases participate in engines.dsh exactly as they do in peers.
  assert.equal((await getCandidate('0.2.2-rc.1', fetcher(release(), { ...manifest(), peerDependencies: {}, engines: { dsh: '>=0.2.1-alpha.2 <0.3.0-0' } }))).version, version)
  // Blank, invalid, and workspace engines.dsh ranges are unmet; workspace: stays a peer-only rule.
  for (const range of ['', '   ', 'not-a-range', 'workspace:^']) await assert.rejects(getCandidate(runtime, fetcher(release(), { ...manifest(), peerDependencies: {}, engines: { dsh: range } })), /incompatible/)
  // Malformed engines or peer fields state no readable rule.
  for (const engines of [{ dsh: 2 }, null, 'x', []]) await assert.rejects(getCandidate(runtime, fetcher(release(), { ...manifest(), engines })), /metadata/)
  await assert.rejects(getCandidate(runtime, fetcher(release(), { ...manifest(), peerDependencies: { '@deepseek-ai/dsh': 1 } })), /metadata/)
  await assert.rejects(getCandidate(runtime, fetcher(release(), { ...manifest(), peerDependencies: null })), /metadata/)
})
test('an unmet engines.dsh release surfaces the needed range before any install', async t => {
  const engines = { ...manifest(), engines: { dsh: '>=0.2.2 <0.3.0-0' }, peerDependencies: { '@deepseek-ai/dsh': '>=0.2.1-alpha.2 <0.3.0-0' } }
  const { updates, calls } = await fixture(t, { fetcher: fetcher(release(), engines) })
  const checked = await updates.check()
  assert.equal(checked.status, 'incompatible')
  assert.equal(checked.reason, 'incompatible')
  assert.deepEqual(checked.requirements, { 'engines.dsh': '>=0.2.2 <0.3.0-0' })
  assert.equal(calls.length, 0)
})
test('the host-substituted evaluator decides instead of the local rule', async t => {
  const asked = []
  const accepted = await fixture(t, { evaluate: (manifestValue, runtimeValue) => { asked.push([runtimeValue, manifestValue.name]); return {} } })
  assert.equal((await accepted.updates.check()).status, 'available')
  assert.deepEqual(asked, [[runtime, PACKAGE]])
  const rejected = await fixture(t, { evaluate: () => ({ 'engines.dsh': '>=0.2.2 <0.3.0-0' }) })
  const checked = await rejected.updates.check()
  assert.equal(checked.status, 'incompatible')
  assert.deepEqual(checked.requirements, { 'engines.dsh': '>=0.2.2 <0.3.0-0' })
  assert.equal(rejected.calls.length, 0)
})
test('an update that becomes incompatible during install revalidation shows the unmet requirement', async t => {
  let evaluations = 0
  const { updates, calls } = await fixture(t, {
    evaluate: () => ++evaluations === 1 ? {} : { 'engines.dsh': '>=0.2.2 <0.3.0-0' },
  })
  const checked = await updates.check()
  assert.equal(checked.status, 'available')
  const result = await updates.install(checked.candidate.id, randomUUID(), updates.profileKey)
  assert.equal(result.status, 'incompatible')
  assert.equal(result.reason, 'incompatible')
  assert.deepEqual(result.requirements, { 'engines.dsh': '>=0.2.2 <0.3.0-0' })
  assert.equal(calls.length, 0)
})
test('Disabled bundle stays disabled; pin remains explicit; restart is not success; journal survives reload', async t => {
  const { updates, manager, dir, calls } = await fixture(t)
  const checked = await updates.check(), id = randomUUID()
  assert.equal(checked.status, 'available')
  const result = await updates.install(checked.candidate.id, id, updates.profileKey)
  assert.equal(result.status, 'restart-required'); assert.equal(calls.length, 1)
  assert.equal(calls[0].config.enabled, false); assert.equal(calls[0].config.requestId, id)
  assert.equal(calls[0].spec, `github:${REPOSITORY}#${tag}`)
  await updates.install(checked.candidate.id, id, updates.profileKey); assert.equal(calls.length, 1)
  const restarted = new Updates(() => manager, dir, version, runtime, fetcher())
  assert.equal((await restarted.status()).status, 'applied')
})
test('Failure, cancellation, override and incorrect manifest version are never success', async t => {
  for (const application of ['failed', 'cancelled', 'overridden', 'applied']) {
    const { updates } = await fixture(t, { result: { application, ...(application === 'applied' ? { version: '9.0.0' } : {}) } })
    const checked = await updates.check()
    const result = await updates.install(checked.candidate.id, randomUUID(), updates.profileKey)
    assert.equal(result.status, application === 'applied' ? 'unknown' : application)
  }
})
test('Installer transport loss and null wait result remain unknown and never resend', async t => {
  let installs = 0
  const { updates, dir, manager } = await fixture(t, { manager: { installBundle: async () => { installs++; throw new Error('lost') } } })
  const checked = await updates.check(), id = randomUUID()
  assert.equal((await updates.install(checked.candidate.id, id, updates.profileKey)).status, 'unknown')
  const reconnect = new Updates(() => manager, dir, '0.2.0', runtime, fetcher())
  assert.equal((await reconnect.status()).status, 'unknown')
  await reconnect.install(checked.candidate.id, id, reconnect.profileKey); assert.equal(installs, 1)
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
  assert.equal((await updates.install(checked.candidate.id, randomUUID(), updates.profileKey)).status, 'restart-required')
  assert.match(calls[0].spec, /\.dsh-japanese-update\/verified-.*\.tgz$/)
  assert.equal(calls[0].config.enabled, false)
})
test('Checksum failure is recorded as failure before manager is invoked', async t => {
  const normal = fetcher()
  const { updates, calls } = await fixture(t, { bundle: { source: `https://github.com/${REPOSITORY}/releases/download/v0.2.0/local-dsh-japanese-0.2.0.tgz` }, fetcher: url => String(url).endsWith('SHA256SUMS') ? Promise.resolve(new Response('invalid')) : normal(url) })
  const checked = await updates.check()
  assert.equal((await updates.install(checked.candidate.id, randomUUID(), updates.profileKey)).status, 'failed')
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
  requests[0].resolve({ ok: true, value: { status: 'available', profileKey: PROFILE_KEY, running: '0.2.0', candidate: { id: 'candidate', version, url: `https://github.com/${REPOSITORY}/releases/tag/${tag}`, runtime, notes: '' } } }); await first
  const install = controller.install(); const duplicate = controller.install(); await duplicate
  controller.reset()
  assert.equal(requests[2].method, 'dsh-japanese-updates/update-status')
  requests[2].resolve({ ok: true, value: { status: 'restart-required', operation: requests[1].payload.operationId, profileKey: PROFILE_KEY, running: '0.2.0' } }); await new Promise(resolve => setImmediate(resolve))
  requests[1].resolve({ ok: true, value: { status: 'applied', profileKey: PROFILE_KEY, running: version } }); await install
  assert.equal(controller.getSnapshot().status, 'restart-required')
  assert.equal(requests.filter(request => request.method.endsWith('update-install')).length, 1)
  controller.dispose()
})
test('A failed preparation can be checked and retried with a new operation', async t => {
  let bad = true
  const normal = fetcher()
  const { updates, calls } = await fixture(t, { bundle: { source: 'file:/downloads/local-dsh-japanese-0.2.0.tgz' }, fetcher: url => bad && String(url).endsWith('SHA256SUMS') ? Promise.resolve(new Response('invalid')) : normal(url) })
  const first = await updates.check()
  assert.equal((await updates.install(first.candidate.id, randomUUID(), updates.profileKey)).status, 'failed')
  bad = false
  const second = await updates.check()
  assert.equal((await updates.install(second.candidate.id, randomUUID(), updates.profileKey)).status, 'restart-required')
  assert.equal(calls.length, 1)
})
test('Disabling the plugin during preparation prevents later installer invocation', async t => {
  const normal = fetcher(); let waiting, releaseDownload
  const started = new Promise(resolve => { waiting = resolve })
  const { updates, calls } = await fixture(t, { bundle: { source: 'file:/downloads/local-dsh-japanese-0.2.0.tgz' }, fetcher: async url => {
    if (String(url).endsWith(filename)) { waiting(); await new Promise(resolve => { releaseDownload = resolve }) }
    return normal(url)
  } })
  const checked = await updates.check(), installing = updates.install(checked.candidate.id, randomUUID(), updates.profileKey)
  await started; updates.dispose(); releaseDownload(); await installing
  assert.equal(calls.length, 0)
})
test('Another Client cannot settle an unresolved operation or start a second installation', async t => {
  let installs = 0
  const { updates, dir, manager } = await fixture(t, { manager: { installBundle: async () => { installs++; throw new Error('lost manager result') } } })
  const checked = await updates.check(), firstId = randomUUID()
  assert.equal((await updates.install(checked.candidate.id, firstId, updates.profileKey)).status, 'unknown')
  const second = new Updates(() => manager, dir, '0.2.0', runtime, fetcher())
  assert.equal((await second.install(checked.candidate.id, randomUUID(), second.profileKey)).status, 'unknown')
  const third = new Updates(() => manager, dir, '0.2.0', runtime, fetcher())
  assert.equal((await third.status()).status, 'unknown')
  assert.equal((await third.check()).status, 'unknown')
  assert.equal((await third.install(checked.candidate.id, randomUUID(), third.profileKey)).status, 'unknown')
  assert.equal(installs, 1)
  assert.equal((await updates.status()).operation, firstId)
})
test('A busy install rejects another operation ID and a check cannot masquerade as an install', async t => {
  let settle, begun
  const start = new Promise(resolve => { begun = resolve })
  const { updates } = await fixture(t, { manager: { installBundle: async () => { begun(); return new Promise(resolve => { settle = resolve }) } } })
  const checked = await updates.check()
  const first = updates.install(checked.candidate.id, randomUUID(), updates.profileKey); await start
  await assert.rejects(updates.install(checked.candidate.id, randomUUID(), updates.profileKey), /busy/)
  settle({ changed: false, application: 'failed', stage: 'install', target: PACKAGE }); await first
})
test('Matching checksums never admit an archive with the wrong package, version or dsh requirements', async t => {
  const invalid = [
    { value: { ...manifest(), name: 'wrong-package' }, status: 'failed' },
    { value: { ...manifest(), version: '0.2.0' }, status: 'failed' },
    { value: { ...manifest(), peerDependencies: { '@deepseek-ai/dsh-web': '99.0.0' } }, status: 'incompatible', requirements: { '@deepseek-ai/dsh-web': '99.0.0' } },
    { value: { ...manifest(), engines: { dsh: '>=0.2.2 <0.3.0-0' } }, status: 'incompatible', requirements: { 'engines.dsh': '>=0.2.2 <0.3.0-0' } },
  ]
  for (const { value, status, requirements } of invalid) {
    const wrong = archive(value), normal = fetcher()
    const { updates, calls } = await fixture(t, { bundle: { source: 'file:/downloads/local-dsh-japanese-0.2.0.tgz' }, fetcher: async url => String(url).endsWith('SHA256SUMS') ? new Response(`${createHash('sha256').update(wrong).digest('hex')}  ${filename}\n`) : String(url).endsWith(filename) ? new Response(wrong) : normal(url) })
    const checked = await updates.check()
    const result = await updates.install(checked.candidate.id, randomUUID(), updates.profileKey)
    assert.equal(result.status, status)
    if (requirements) assert.deepEqual(result.requirements, requirements)
    assert.equal(calls.length, 0)
  }
})
test('A tarball compatibility refusal survives a lost reply, reconnect and fresh journal load', async t => {
  const unmet = { 'engines.dsh': '>=0.2.2 <0.3.0-0' }
  const wrong = archive({ ...manifest(), engines: { dsh: unmet['engines.dsh'] } }), normal = fetcher()
  const fetchArchive = async url => String(url).endsWith('SHA256SUMS')
    ? new Response(`${createHash('sha256').update(wrong).digest('hex')}  ${filename}\n`)
    : String(url).endsWith(filename) ? new Response(wrong) : normal(url)
  const { updates, manager, dir, calls } = await fixture(t, { bundle: { source: 'file:/downloads/local-dsh-japanese-0.2.0.tgz' }, fetcher: fetchArchive })
  const checked = await updates.check(), id = randomUUID()
  assert.equal(checked.status, 'available', 'the raw release manifest remains compatible')

  // The install reply can be lost after the host has persisted its refusal.
  const reply = await updates.install(checked.candidate.id, id, updates.profileKey)
  assert.equal(reply.status, 'incompatible')
  assert.deepEqual(reply.requirements, unmet)
  assert.equal(calls.length, 0)

  const reconnect = new Updates(() => manager, dir, '0.2.0', runtime, fetchArchive)
  for (const restored of [await updates.status(id), await reconnect.status(id)]) {
    assert.equal(restored.status, 'incompatible')
    assert.equal(restored.reason, 'incompatible')
    assert.equal(restored.operation, id)
    assert.deepEqual(restored.requirements, unmet)
  }
  const freshLoad = new Updates(() => manager, dir, '0.2.0', runtime, fetchArchive)
  const restoredWithoutReceipt = await freshLoad.status()
  assert.equal(restoredWithoutReceipt.status, 'incompatible')
  assert.deepEqual(restoredWithoutReceipt.requirements, unmet)
  assert.equal(calls.length, 0)
})
test('A busy refusal clears the unadmitted Client ID before reconciling the Host operation', async () => {
  let count = 0
  const controller = new UpdateController({ rpc: { call: async (_base, method, payload) => {
    count++
    if (method.endsWith('update-install')) return { ok: false, error: { code: 'dsh-japanese/busy' } }
    if (count > 2) assert.equal(payload.operationId, undefined)
    return { ok: true, value: { status: 'available', profileKey: PROFILE_KEY, running: '0.2.0', candidate: { id: 'fixture', version, url: `https://github.com/${REPOSITORY}/releases/tag/${tag}`, runtime, notes: '' } } }
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
  const checked = await updates.check(), installing = updates.install(checked.candidate.id, randomUUID(), updates.profileKey)
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
function memoryStorage(values = []) {
  const entries = new Map(values)
  return { entries, getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) }
}
function clientView(overrides = {}) { return { status: 'idle', profileKey: PROFILE_KEY, running: '0.2.0', ...overrides } }
test('Same-origin profile changes isolate cached receipts and canonical Host latest operation wins', async () => {
  const firstKey = PROFILE_KEY, secondKey = 'b'.repeat(64), stale = randomUUID(), latest = randomUUID()
  const storage = memoryStorage([[`dsh.japanesePack.update.${firstKey}.operation`, stale]])
  let key = firstKey, operation = latest; const requests = []
  const controller = new UpdateController({ rpc: { call: async (_base, method, payload) => {
    requests.push({ method, payload, key })
    return { ok: true, value: clientView({ profileKey: key, status: operation ? 'installing' : 'idle', ...(operation ? { operation } : {}) }) }
  } } }, storage)
  await controller.status(); await controller.status()
  assert.equal(controller.getSnapshot().operation, latest)
  assert.equal(storage.entries.get(`dsh.japanesePack.update.${firstKey}.operation`), latest)
  assert(requests.every(request => !request.payload.operationId))
  key = secondKey; operation = undefined; await controller.status()
  assert.equal(controller.getSnapshot().status, 'idle'); assert.equal(controller.getSnapshot().profileKey, secondKey)
  assert.equal(requests.at(-1).payload.operationId, undefined)
  assert.equal(storage.entries.get(`dsh.japanesePack.update.${secondKey}.operation`), undefined)
  controller.dispose()
})
test('Lost first install reply survives reload using only the owning profile fallback receipt', async () => {
  const storage = memoryStorage(), requests = []
  const available = clientView({ status: 'available', candidate: { id: 'fixture', version, url: `https://github.com/${REPOSITORY}/releases/tag/${tag}`, runtime, notes: '' } })
  const first = new UpdateController({ rpc: { call: async (_base, method, payload) => {
    requests.push({ method, payload })
    if (method.endsWith('update-install')) { assert.equal(payload.profileKey, PROFILE_KEY); assert.equal(storage.entries.get(`dsh.japanesePack.update.${PROFILE_KEY}.operation`), payload.operationId); throw Error('lost') }
    return { ok: true, value: available }
  } } }, storage)
  await first.status(); await first.install(); first.dispose()
  const id = storage.entries.get(`dsh.japanesePack.update.${PROFILE_KEY}.operation`)
  const next = new UpdateController({ rpc: { call: async (_base, method, payload) => { requests.push({ method, payload }); return { ok: true, value: clientView(payload.operationId ? { status: 'unknown', operation: payload.operationId } : {}) } } } }, storage)
  await next.status(); assert.equal(next.getSnapshot().status, 'unknown'); assert.equal(next.getSnapshot().operation, id)
  assert.equal(requests.filter(request => request.method.endsWith('update-install')).length, 1)
  next.dispose()
})
test('An unadmitted profile refusal clears the newly stored Client operation ID', async () => {
  const storage = memoryStorage()
  const controller = new UpdateController({ rpc: { call: async (_base, method) => method.endsWith('update-install') ? { ok: false, error: { code: 'updater/profile-changed' } } : { ok: true, value: clientView({ status: 'available', candidate: { id: 'fixture', version, url: `https://github.com/${REPOSITORY}/releases/tag/${tag}`, runtime, notes: '' } }) } } }, storage)
  await controller.status(); await controller.install(); assert.equal(storage.entries.size, 0); assert.equal(controller.getSnapshot().status, 'failed'); controller.dispose()
})
test('A pre-admission incompatibility clears the Client ID and reload reconciles without an unknown receipt', async () => {
  const storage = memoryStorage(), requests = []
  const candidate = { id: 'fixture', version, url: `https://github.com/${REPOSITORY}/releases/tag/${tag}`, runtime, notes: '' }
  const rpc = { call: async (_base, method, payload) => {
    requests.push({ method, payload })
    if (method.endsWith('update-install')) return { ok: true, value: clientView({ status: 'incompatible', reason: 'incompatible', requirements: { 'engines.dsh': '>=0.2.2 <0.3.0-0' } }) }
    return { ok: true, value: clientView({ status: 'available', candidate }) }
  } }
  const controller = new UpdateController({ rpc }, storage)
  await controller.status(); await controller.install()
  assert.equal(controller.getSnapshot().status, 'incompatible')
  assert.deepEqual(controller.getSnapshot().requirements, { 'engines.dsh': '>=0.2.2 <0.3.0-0' })
  assert.equal(storage.entries.size, 0)
  const nextRequests = []
  const reloaded = new UpdateController({ rpc: { call: async (_base, method, payload) => {
    nextRequests.push({ method, payload })
    return { ok: true, value: clientView({ status: 'incompatible', reason: 'incompatible', requirements: { 'engines.dsh': '>=0.2.2 <0.3.0-0' } }) }
  } } }, storage)
  await reloaded.status()
  assert.equal(nextRequests[0].payload.operationId, undefined)
  assert.equal(reloaded.getSnapshot().status, 'incompatible')
  assert.equal(requests.find(request => request.method.endsWith('update-install')).payload.operationId.length, 36)
  controller.dispose(); reloaded.dispose()
})
test('Different or missing expected profile identity cannot admit an installation', async t => {
  const { updates, calls } = await fixture(t), checked = await updates.check()
  await assert.rejects(updates.install(checked.candidate.id, randomUUID(), 'b'.repeat(64)), /profile-changed/)
  await assert.rejects(updates.install(checked.candidate.id, randomUUID(), undefined), /profile-changed/)
  assert.equal(calls.length, 0)
})
test('Update copy keeps the same English and Japanese keys', () => {
  assert.deepEqual(Object.keys(en).sort(), Object.keys(ja).sort())
})
const later = task => { queueMicrotask(() => { void task() }) }
test('HMR already-installed removes on a later turn, then installs while staying disabled', async t => {
  const seen = []
  let installs = 0, removed = 0, atSchedule = -1
  const { updates, bundle } = await fixture(t, { schedule: task => { atSchedule = removed; later(task) }, manager: {
    installBundle: async (spec, config) => {
      installs++; seen.push({ spec, config })
      if (installs === 1) return { changed: false, application: 'failed', stage: 'install', target: spec, error: { code: 'already-installed' } }
      bundle.version = version; bundle.source = spec; bundle.installed = true
      return { changed: true, application: 'applied', stage: 'install', target: spec, version, bundle: PACKAGE }
    },
    removeBundle: async name => { removed++; assert.equal(name, PACKAGE); bundle.installed = false; return { changed: true, application: 'applied', stage: 'remove', target: name } },
  } })
  const checked = await updates.check()
  const result = await updates.install(checked.candidate.id, randomUUID(), updates.profileKey)
  assert.equal(atSchedule, 0); assert.equal(result.status, 'restart-required'); assert.equal(removed, 1); assert.equal(installs, 2)
  assert.equal(seen[1].config.enabled, false); assert.equal(seen[1].spec, `github:${REPOSITORY}#${tag}`)
})
test('Stopping this plugin during removal does not cancel the install that follows it', async t => {
  const holder = {}
  let installs = 0
  holder.current = await fixture(t, { schedule: later, manager: {
    installBundle: async spec => {
      installs++
      if (installs === 1) return { changed: false, application: 'failed', stage: 'install', target: spec, error: { code: 'already-installed' } }
      holder.current.bundle.version = version; holder.current.bundle.installed = true
      return { changed: true, application: 'applied', stage: 'install', target: spec, version, bundle: PACKAGE }
    },
    removeBundle: async () => { holder.current.updates.dispose(); return { changed: true, application: 'applied', stage: 'remove', target: PACKAGE } },
  } })
  const checked = await holder.current.updates.check()
  assert.equal((await holder.current.updates.install(checked.candidate.id, randomUUID(), holder.current.updates.profileKey)).status, 'restart-required')
  assert.equal(installs, 2)
})
test('A failed removal is not followed by another install', async t => {
  let installs = 0
  const { updates } = await fixture(t, { schedule: later, manager: {
    installBundle: async spec => { installs++; return { changed: false, application: 'failed', stage: 'install', target: spec, error: { code: 'already-installed' } } },
    removeBundle: async () => ({ changed: false, application: 'failed', stage: 'remove', target: PACKAGE, error: { code: 'not-removable' } }),
  } })
  const checked = await updates.check()
  const result = await updates.install(checked.candidate.id, randomUUID(), updates.profileKey)
  assert.equal(result.status, 'failed'); assert.equal(result.reason, 'not-removable'); assert.equal(installs, 1)
})
test('A missing removeBundle reports already-installed and does not throw', async t => {
  const { updates } = await fixture(t, { manager: { installBundle: async spec => ({ changed: false, application: 'failed', stage: 'install', target: spec, error: { code: 'already-installed' } }) } })
  const checked = await updates.check()
  const result = await updates.install(checked.candidate.id, randomUUID(), updates.profileKey)
  assert.equal(result.status, 'failed'); assert.equal(result.reason, 'already-installed')
})
test('Disposing before the replacement task runs does not remove the package', async t => {
  const holder = {}
  let removed = 0
  holder.current = await fixture(t, { schedule: task => { holder.current.updates.dispose(); return task() }, manager: {
    installBundle: async spec => ({ changed: false, application: 'failed', stage: 'install', target: spec, error: { code: 'already-installed' } }),
    removeBundle: async () => { removed++; return { changed: true, application: 'applied', stage: 'remove', target: PACKAGE } },
  } })
  const { updates } = holder.current
  const checked = await updates.check()
  assert.equal((await updates.install(checked.candidate.id, randomUUID(), updates.profileKey)).status, 'cancelled')
  assert.equal(removed, 0)
})
test('A failed replacement restores the previous spec when the package is gone', async t => {
  const seen = []
  let installs = 0
  const { updates, bundle, dir, manager } = await fixture(t, { schedule: later, manager: {
    installBundle: async (spec, config) => {
      installs++; seen.push({ spec, config })
      if (installs === 1) return { changed: false, application: 'failed', stage: 'install', target: spec, error: { code: 'already-installed' } }
      if (installs === 2) { bundle.installed = false; return { changed: false, application: 'failed', stage: 'install', target: spec, error: { code: 'operation-error' } } }
      bundle.installed = true
      return { changed: true, application: 'applied', stage: 'install', target: spec, version: '0.2.0', bundle: PACKAGE }
    },
    removeBundle: async () => { bundle.installed = false; return { changed: true, application: 'applied', stage: 'remove', target: PACKAGE } },
  } })
  const checked = await updates.check(), id = randomUUID()
  const restored = await updates.install(checked.candidate.id, id, updates.profileKey)
  assert.equal(restored.status, 'failed'); assert.equal(restored.reason, 'operation-error'); assert.equal(installs, 3)
  assert.equal(seen[2].spec, `github:${REPOSITORY}#v0.2.0`); assert.equal(seen[2].config.enabled, false)
  const reloaded = new Updates(() => manager, dir, '0.2.0', runtime, fetcher())
  assert.equal((await reloaded.status()).status, 'failed'); assert.equal((await reloaded.status()).reason, 'operation-error'); assert.equal((await reloaded.status()).operation, id)
})
test('A failed restore reports that the previous package is missing and how to reinstall', async t => {
  const seen = []
  let installs = 0
  const { updates, bundle, dir, manager } = await fixture(t, { schedule: later, manager: {
    installBundle: async (spec, config) => {
      installs++; seen.push({ spec, config })
      if (installs === 1) return { changed: false, application: 'failed', stage: 'install', target: spec, error: { code: 'already-installed' } }
      bundle.installed = false
      return { changed: false, application: 'failed', stage: 'install', target: spec, error: { code: 'operation-error' } }
    },
    removeBundle: async () => { bundle.installed = false; return { changed: true, application: 'applied', stage: 'remove', target: PACKAGE } },
  } })
  const checked = await updates.check(), id = randomUUID()
  const failed = await updates.install(checked.candidate.id, id, updates.profileKey)
  assert.equal(failed.status, 'failed'); assert.equal(failed.reason, 'restore-failed'); assert.equal(installs, 3)
  assert.equal(seen[2].spec, `github:${REPOSITORY}#v0.2.0`); assert.equal(seen[2].config.enabled, false)
  assert.match(ja['restore-failed'], /以前の版も戻せませんでした/)
  assert.match(ja['restore-failed'], /github:Aero123421\/dsh-japanese/)
  assert.match(ja['restore-failed'], /プラグインを追加/)
  assert.equal(ja['restore-failed-command'], 'dsh plugin --profile web add -w github:Aero123421/dsh-japanese')
  assert.match(en['restore-failed'], /previous version could not be restored/)
  assert.equal(en['restore-failed-command'], ja['restore-failed-command'])
  const reloaded = new Updates(() => manager, dir, '0.2.0', runtime, fetcher())
  const again = await reloaded.status()
  assert.equal(again.status, 'failed'); assert.equal(again.reason, 'restore-failed'); assert.equal(again.operation, id)
  assert.equal((await reloaded.check()).reason, 'restore-failed')
})
test('A thrown restore install is not reported as the original install failure', async t => {
  let installs = 0
  const { updates, bundle } = await fixture(t, { schedule: later, manager: {
    installBundle: async spec => {
      installs++
      if (installs === 1) return { changed: false, application: 'failed', stage: 'install', target: spec, error: { code: 'already-installed' } }
      if (installs === 2) { bundle.installed = false; return { changed: false, application: 'failed', stage: 'install', target: spec, error: { code: 'operation-error' } } }
      throw new Error('restore exploded')
    },
    removeBundle: async () => { bundle.installed = false; return { changed: true, application: 'applied', stage: 'remove', target: PACKAGE } },
  } })
  const checked = await updates.check()
  const failed = await updates.install(checked.candidate.id, randomUUID(), updates.profileKey)
  assert.equal(failed.status, 'failed'); assert.equal(failed.reason, 'restore-failed'); assert.equal(installs, 3)
})
test('An unknown package list after removal does not claim the package is gone or install again', async t => {
  let installs = 0, removed = false
  const { updates, bundle } = await fixture(t, { schedule: later, manager: {
    listBundles: async () => { if (removed) throw new Error('list failed'); return [bundle] },
    installBundle: async spec => {
      installs++
      if (installs === 1) return { changed: false, application: 'failed', stage: 'install', target: spec, error: { code: 'already-installed' } }
      bundle.installed = false
      return { changed: false, application: 'failed', stage: 'install', target: spec, error: { code: 'operation-error' } }
    },
    removeBundle: async () => { bundle.installed = false; removed = true; return { changed: true, application: 'applied', stage: 'remove', target: PACKAGE } },
  } })
  const checked = await updates.check()
  const failed = await updates.install(checked.candidate.id, randomUUID(), updates.profileKey)
  assert.equal(failed.status, 'failed'); assert.equal(failed.reason, 'operation-error'); assert.equal(installs, 2)
})
test('An ordinary install does not remove the bundle on the alpha.2 path', async t => {
  let removed = 0
  const { updates } = await fixture(t, { manager: { removeBundle: async () => { removed++; throw new Error('remove') } } })
  const checked = await updates.check()
  assert.equal((await updates.install(checked.candidate.id, randomUUID(), updates.profileKey)).status, 'restart-required')
  assert.equal(removed, 0)
})
test('Authoritative cancellation preserves its outcome after the installer abort exit', async t => {
  const { updates } = await fixture(t, { result: { application: 'cancelled', packageResult: { exitCode: 130, timedOut: false } } })
  const checked = await updates.check()
  assert.equal((await updates.install(checked.candidate.id, randomUUID(), updates.profileKey)).status, 'cancelled')
})
