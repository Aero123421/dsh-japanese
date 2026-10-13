import { randomUUID, createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rename, writeFile, lstat } from 'node:fs/promises'
import { join, resolve, relative, isAbsolute } from 'node:path'
import { boundedFetch } from './update-download.ts'
import { gunzipSync } from 'node:zlib'
import semver from 'semver'
import { brandString } from '@deepseek-ai/dsh-brand'
import type { BundleInfo, ChangeResult, ManagementError, PluginInstallRequestId } from '@deepseek-ai/dsh-plugin-manager/types'

export const PACKAGE = '@local/dsh-japanese'
export const REPOSITORY = 'Aero123421/dsh-japanese'
export const RELEASES = `https://github.com/${REPOSITORY}/releases`
export interface Manager {
  listBundles(): Promise<BundleInfo[]>
  installBundle(spec: string, options: { enabled: boolean; requestId: PluginInstallRequestId }): Promise<ChangeResult>
  waitForInstall(requestId: PluginInstallRequestId): Promise<ChangeResult | null>
}
export type UpdateStatus = 'idle' | 'available' | 'current' | 'unavailable' | 'incompatible' | 'checking' | 'installing' | 'unknown' | 'restart-required' | 'applied' | 'overridden' | 'failed' | 'cancelled'
interface Candidate { id: string; version: string; tag: string; notes: string; url: string; runtime: string; filename: string; tarball: string; checksum: string }
interface Operation { id: string; version: string; result?: ChangeResult }
export interface UpdateView { status: UpdateStatus; running: string; installed?: string; candidate?: Candidate; operation?: string; reason?: string; stage?: string; checkedAt?: string }

// Explicit GitHub tags remain explicit. Release filenames classify the local
// tarball route; only the new fixed-repository candidate is verified.
function inside(directory: string, file: string): boolean {
  const path = relative(resolve(directory), resolve(file))
  return !!path && path !== '..' && !path.startsWith('..' + (process.platform === 'win32' ? '\\' : '/')) && !isAbsolute(path)
}
export function supportsSource(source: string | undefined, directory?: string, installedVersion?: string): boolean {
  return typeof source === 'string' && (/^(?:github:)?Aero123421\/dsh-japanese(?:#[A-Za-z0-9._/-]+)?$/i.test(source) || /^(?:git\+)?https:\/\/github\.com\/Aero123421\/dsh-japanese(?:\.git)?(?:#[A-Za-z0-9._/-]+)?$/.test(source) || /^https:\/\/github\.com\/Aero123421\/dsh-japanese\/releases\/download\/v[^/]+\/local-dsh-japanese-[^/]+\.tgz$/.test(source) || !!(directory && source.startsWith('file:') && inside(directory, source.slice(5))) || !!(installedVersion && semver.valid(installedVersion) && source.startsWith('file:') && source.replaceAll('\\', '/').endsWith(`/local-dsh-japanese-${installedVersion}.tgz`)))
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('metadata')
  return value as Record<string, unknown>
}
function errorCode(value: unknown): ManagementError['code'] {
  const values: ManagementError['code'][] = ['management-required', 'unaddressable', 'unknown-plugin', 'invalid-spec', 'ambiguous-install', 'not-bundle', 'not-removable', 'stop-profile', 'bundle-in-use', 'stale-approval', 'incompatible-version', 'operation-error']
  return values.find(code => code === value) ?? 'operation-error'
}
export function packageManifest(bytes: Buffer): Record<string, unknown> {
  const tar = gunzipSync(bytes, { maxOutputLength: 128 * 1024 * 1024 })
  let manifest: Record<string, unknown> | undefined
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512)
    if (header.every(byte => byte === 0)) break
    const name = header.subarray(0, 100).toString().replace(/\0.*$/, '')
    const prefix = header.subarray(345, 500).toString().replace(/\0.*$/, '')
    const sizeText = header.subarray(124, 136).toString().replace(/\0.*$/, '').trim()
    if (!/^[0-7]+$/.test(sizeText)) throw new Error('metadata')
    const size = Number.parseInt(sizeText, 8)
    if (!Number.isSafeInteger(size) || offset + 512 + size > tar.length) throw new Error('metadata')
    const path = prefix ? `${prefix}/${name}` : name
    if (path === 'package/package.json') {
      if (manifest || ![0, 48].includes(header[156]!) || size > 65536) throw new Error('metadata')
      manifest = record(JSON.parse(tar.subarray(offset + 512, offset + 512 + size).toString()))
    }
    offset += 512 + Math.ceil(size / 512) * 512
  }
  if (!manifest) throw new Error('metadata')
  return manifest
}
async function json(url: string, fetcher: typeof fetch): Promise<unknown> {
  const response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(15_000), headers: { accept: 'application/vnd.github+json' } })
  if (!response.ok) throw new Error(`fetch-${response.status}`)
  if (!response.body) throw new Error('metadata')
  const reader = response.body.getReader(); let length = 0; const chunks: Uint8Array[] = []
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; length += value.byteLength; if (length > 512_000) throw new Error('metadata-size'); chunks.push(value) }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}
export async function getCandidate(runtime: string, fetcher: typeof fetch = fetch): Promise<Candidate> {
  const release = record(await json(`https://api.github.com/repos/${REPOSITORY}/releases/latest`, fetcher))
  const tag = release.tag_name, version = typeof tag === 'string' && tag.startsWith('v') ? tag.slice(1) : ''
  if (!Number.isSafeInteger(release.id) || release.draft !== false || release.prerelease !== false || !semver.valid(version) || semver.prerelease(version) || release.html_url !== `${RELEASES}/tag/${tag}`) throw new Error('metadata')
  const manifest = record(await json(`https://raw.githubusercontent.com/${REPOSITORY}/${tag}/package.json`, fetcher))
  if (manifest.name !== PACKAGE || manifest.version !== version || record(record(manifest.dsh).bundle).patch !== './cordis.patch.yml') throw new Error('metadata')
  const peers = record(manifest.peerDependencies)
  const ranges = Object.entries(peers).filter(([name]) => name === '@deepseek-ai/dsh' || name.startsWith('@deepseek-ai/dsh-'))
  if (!ranges.length || !semver.valid(runtime) || ranges.some(([, range]) => typeof range !== 'string' || !semver.validRange(range) || !semver.satisfies(runtime, range, { includePrerelease: true }))) throw new Error('incompatible')
  const filename = `local-dsh-japanese-${version}.tgz`
  if (!Array.isArray(release.assets)) throw new Error('asset')
  const assets = release.assets
  const asset = (name: string): string => {
    const matches = assets.filter(value => record(value).name === name)
    if (matches.length !== 1) throw new Error('asset')
    const value = record(matches[0]), url = `https://github.com/${REPOSITORY}/releases/download/${tag}/${name}`
    if (!Number.isSafeInteger(value.id) || Number(value.id) <= 0 || !Number.isSafeInteger(value.size) || Number(value.size) <= 0 || value.browser_download_url !== url) throw new Error('asset')
    return url
  }
  return { filename, tarball: asset(filename), checksum: asset('SHA256SUMS'), id: `${release.id}:${tag}`, version, tag: String(tag), notes: typeof release.body === 'string' ? release.body.slice(0, 4000) : '', url: String(release.html_url), runtime }
}
export class Updates {
  private view: UpdateView
  private candidate?: Candidate | undefined
  private operation?: Operation | undefined
  private pendingOperation?: string | undefined
  private pending?: Promise<UpdateView> | undefined
  private readonly getManager: () => Manager | undefined
  private readonly dir: string | undefined
  private readonly running: string
  private readonly runtime: string
  private readonly fetcher: typeof fetch
  private closed = false
  private readonly abort = new AbortController()
  constructor(getManager: () => Manager | undefined, dir: string | undefined, running: string, runtime: string, fetcher: typeof fetch = fetch) {
    this.getManager = getManager; this.dir = dir; this.running = running; this.runtime = runtime
    this.fetcher = (input, options) => fetcher(input, { ...options, signal: options?.signal ? AbortSignal.any([options.signal, this.abort.signal]) : this.abort.signal })
    this.view = { status: 'idle', running }
  }
  dispose() { this.closed = true; this.abort.abort() }
  private get manager(): Manager | undefined { return this.getManager() }
  private path(): string { if (!this.dir) throw new Error('management-required'); return join(this.dir, '.dsh-japanese-update', 'operation.json') }
  private async save() {
    const path = this.path(); await mkdir(join(this.dir!, '.dsh-japanese-update'), { recursive: true, mode: 0o700 })
    if ((await lstat(join(this.dir!, '.dsh-japanese-update'))).isSymbolicLink()) throw new Error('storage')
    const temp = `${path}.${randomUUID()}.tmp`
    // This journal holds no configuration, API keys, paths, or installer output.
    await writeFile(temp, JSON.stringify({ id: this.operation!.id, version: this.operation!.version, ...(this.operation!.result ? { result: { bundle: this.operation!.result.bundle, application: this.operation!.result.application, version: this.operation!.result.version, stage: this.operation!.result.stage, error: this.operation!.result.error ? { code: this.operation!.result.error.code } : undefined } } : {}) }), { mode: 0o600, flag: 'wx' })
    await rename(temp, path)
  }
  private async bundle(): Promise<BundleInfo> {
    if (this.closed) throw new Error('cancelled')
    if (!this.manager || !this.dir || typeof this.manager.listBundles !== 'function' || typeof this.manager.installBundle !== 'function' || typeof this.manager.waitForInstall !== 'function') throw new Error('management-required')
    const bundle = (await this.manager.listBundles()).find(row => row.name === PACKAGE)
    if (!bundle?.installed || bundle.readOnlyReason || bundle.error) throw new Error(bundle?.readOnlyReason ?? 'not-installed')
    if (!supportsSource(bundle.source, this.dir && join(this.dir, '.dsh-japanese-update'), bundle.version)) throw new Error('source-unsupported')
    if (bundle.source?.startsWith('file:')) {
      const file = await lstat(bundle.source.slice(5)).catch(() => undefined)
      if (!file?.isFile() || file.isSymbolicLink()) throw new Error('source-unsupported')
    }
    return bundle
  }
  private fail(error: unknown, status: UpdateStatus = 'failed'): UpdateView {
    const reason = error instanceof Error ? error.message : 'operation-error'
    const known = ['management-required', 'unaddressable', 'not-installed', 'source-unsupported', 'metadata', 'metadata-size', 'incompatible', 'asset', 'checksum', 'redirect', 'size', 'storage', 'cancelled', 'candidate-changed', 'settings-changed', 'result-unknown', 'invalid-request', 'journal', 'release-unavailable', 'network']
    this.view = { ...this.view, status, reason: known.includes(reason) ? reason : 'operation-error' }; return this.view
  }
  async status(expectedId?: unknown): Promise<UpdateView> {
    try {
      if (expectedId !== undefined && (typeof expectedId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(expectedId))) throw new Error('invalid-request')
      const bundle = await this.bundle(); this.view = { ...this.view, installed: bundle.version ?? 'unknown' }
      if (!this.operation) {
        try {
          const value = record(JSON.parse(await readFile(this.path(), 'utf8')))
          if (typeof value.id !== 'string' || !/^[0-9a-f-]{36}$/.test(value.id) || typeof value.version !== 'string' || !semver.valid(value.version)) throw new Error('journal')
          const operation: Operation = { id: value.id, version: value.version }
          if (value.result) {
            const result = record(value.result)
            if (!['applied', 'restart-required', 'overridden', 'failed', 'cancelled'].includes(String(result.application)) || !['install', 'enable', 'remove'].includes(String(result.stage))) throw new Error('journal')
            operation.result = { changed: false, target: PACKAGE, ...(result.bundle === PACKAGE ? { bundle: PACKAGE } : {}), application: result.application as ChangeResult['application'], stage: result.stage as ChangeResult['stage'], ...(typeof result.version === 'string' ? { version: result.version } : {}), ...(result.error ? { error: { code: errorCode(record(result.error).code) } } : {}) }
          }
          this.operation = operation
        } catch (error) { if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) return this.fail(error, 'unknown') }
      }
      if (expectedId && expectedId !== this.operation?.id) return { ...this.view, status: 'unknown', operation: typeof expectedId === 'string' ? expectedId : 'invalid' }
      if (this.operation) {
        const result = this.operation.result ?? await this.manager!.waitForInstall(brandString<PluginInstallRequestId>(this.operation.id))
        if (!result) { this.view = { ...this.view, status: 'unknown', operation: this.operation.id }; return this.view }
        this.operation.result = result; await this.save(); return this.result(result, bundle.version)
      }
      return this.view
    } catch (error) { return this.fail(error, 'unavailable') }
  }
  private result(result: ChangeResult, installed?: string): UpdateView {
    const operation = this.operation!
    let status: UpdateStatus = result.application
    if (result.error || result.application === 'failed' || (result.packageResult && (result.packageResult.exitCode !== 0 || result.packageResult.timedOut))) status = 'failed'
    else if (result.application === 'applied' || result.application === 'restart-required') {
      if (result.bundle !== PACKAGE || result.version !== operation.version || installed !== operation.version) status = 'unknown'
      else status = this.running === operation.version ? 'applied' : 'restart-required'
    }
    const { reason: _reason, ...previous } = this.view
    this.view = { ...previous, status, operation: this.operation!.id, stage: result.stage, ...(result.error ? { reason: result.error.code } : {}) }; return this.view
  }
  check(): Promise<UpdateView> {
    if (this.pending) return this.pending
    if (this.view.status === 'installing' || this.view.status === 'unknown') return this.status()
    this.pending = (async () => {
      try {
        const bundle = await this.bundle(); this.candidate = undefined; this.view = { status: 'checking', running: this.running }
        const candidate = await getCandidate(this.runtime, this.fetcher)
        if (!semver.valid(this.running)) throw new Error('metadata')
        this.candidate = candidate
        this.view = { status: semver.gt(candidate.version, bundle.version ?? this.running) ? 'available' : 'current', running: this.running, candidate, checkedAt: new Date().toISOString() }
        return this.view
      } catch (error) { return this.fail(error, error instanceof Error && error.message === 'incompatible' ? 'incompatible' : 'failed') }
    })().finally(() => { this.pending = undefined })
    return this.pending
  }
  install(candidateId: unknown, operationId: unknown): Promise<UpdateView> {
    if (this.pending) return this.pendingOperation !== undefined && this.pendingOperation === operationId ? this.pending : Promise.reject(new Error('busy'))
    this.pendingOperation = typeof operationId === 'string' ? operationId : undefined
    this.pending = (async () => {
      let started = false, admitted = false
      try {
        // Read the journal before admitting a new operation, including after a restart.
        await this.status()
        if (this.operation?.id === operationId) return this.status()
        if (this.operation && !this.operation.result) throw new Error('result-unknown')
        if (typeof operationId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(operationId)) throw new Error('invalid-request')
        const before = await this.bundle(), candidate = await getCandidate(this.runtime, this.fetcher)
        if (!this.candidate || candidate.id !== candidateId || candidate.id !== this.candidate.id || !semver.gt(candidate.version, before.version ?? this.running)) throw new Error('candidate-changed')
        this.operation = { id: operationId, version: candidate.version }; admitted = true; await this.save()
        this.view = { ...this.view, status: 'installing', operation: operationId }
        let spec = `github:${REPOSITORY}#${candidate.tag}`
        if (before.source?.startsWith('file:') || before.source?.includes('/releases/download/')) {
          const checksum = (await boundedFetch(candidate.checksum, 8192, { fetcher: this.fetcher })).toString().trim()
          const match = /^([a-fA-F0-9]{64})  (\S+)$/.exec(checksum)
          if (!match || match[2] !== candidate.filename) throw new Error('checksum')
          const bytes = await boundedFetch(candidate.tarball, 32 * 1024 * 1024, { fetcher: this.fetcher })
          if (createHash('sha256').update(bytes).digest('hex') !== match[1]!.toLowerCase()) throw new Error('checksum')
          const manifest = packageManifest(bytes)
          if (manifest.name !== PACKAGE || manifest.version !== candidate.version || record(record(manifest.dsh).bundle).patch !== './cordis.patch.yml') throw new Error('metadata')
          const peers = Object.entries(record(manifest.peerDependencies)).filter(([name]) => name === '@deepseek-ai/dsh' || name.startsWith('@deepseek-ai/dsh-'))
          if (!peers.length || peers.some(([, range]) => typeof range !== 'string' || !semver.validRange(range) || !semver.satisfies(this.runtime, range, { includePrerelease: true }))) throw new Error('incompatible')
          const directory = await mkdtemp(join(this.dir!, '.dsh-japanese-update', 'verified-'))
          spec = join(directory, candidate.filename)
          await writeFile(spec, bytes, { flag: 'wx', mode: 0o600 })
        }
        const latest = await this.bundle()
        if (latest.source !== before.source || latest.enabled !== before.enabled) throw new Error('settings-changed')
        if (this.closed) throw new Error('cancelled')
        started = true
        const result = await this.manager!.installBundle(spec, { enabled: before.enabled, requestId: brandString<PluginInstallRequestId>(operationId) })
        this.operation.result = result; await this.save()
        const after = await this.bundle(); return this.result(result, after.version)
      } catch (error) {
        if (admitted && this.operation && this.operation.id === operationId && !this.operation.result && !started) {
          this.operation.result = { changed: false, application: 'failed', target: PACKAGE, stage: 'install', error: { code: 'operation-error' } }
          await this.save().catch(() => {})
        }
        return this.fail(error, this.operation && !this.operation.result ? 'unknown' : 'failed')
      }
    })().finally(() => { this.pending = undefined; this.pendingOperation = undefined })
    return this.pending
  }
}
