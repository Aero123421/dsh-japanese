interface Connection { rpc: { call(base: string, method: string, payload: unknown): Promise<{ ok: true; value: unknown } | { ok: false; error: { code: string } }> } }
import type { UpdateView } from './updates.ts'
import { VERSION } from './version.ts'
const NS = 'dsh-japanese-updates'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
interface Storage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
const statuses = ['idle', 'available', 'current', 'unavailable', 'incompatible', 'checking', 'installing', 'unknown', 'restart-required', 'applied', 'overridden', 'failed', 'cancelled']
function parse(value: unknown): UpdateView {
  if (!value || typeof value !== 'object' || !('status' in value) || !statuses.includes(String(value.status)) || !('running' in value) || typeof value.running !== 'string') throw new Error('invalid-response')
  const view = value as UpdateView
  if (view.profileKey !== null && !/^[0-9a-f]{64}$/.test(view.profileKey || '') || view.operation && !uuid.test(view.operation)) throw new Error('invalid-response')
  if (view.candidate && (typeof view.candidate.id !== 'string' || typeof view.candidate.version !== 'string' || typeof view.candidate.url !== 'string' || !view.candidate.url.startsWith('https://github.com/Aero123421/dsh-japanese/releases/tag/v') || typeof view.candidate.notes !== 'string' || typeof view.candidate.runtime !== 'string')) throw new Error('invalid-response')
  return view
}
export class UpdateController {
  private view: UpdateView = { status: 'idle', running: VERSION, profileKey: null }
  private listeners = new Set<() => void>()
  private generation = 0
  private closed = false
  private busy = false
  private operation?: string | undefined
  private profileKey: string | null = null
  private readonly connection: Connection
  private readonly storage: Storage | undefined
  constructor(connection: Connection, storage?: Storage) {
    this.connection = connection
    try { this.storage = storage ?? globalThis.localStorage } catch { this.storage = undefined }
  }
  private storageKey() { return `dsh.japanesePack.update.${this.profileKey}.operation` }
  private remember(id?: string) {
    this.operation = id
    if (!this.profileKey) return
    try { id ? this.storage?.setItem(this.storageKey(), id) : this.storage?.removeItem(this.storageKey()) } catch { /* Optional storage. */ }
  }
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
  getSnapshot = () => this.view
  private publish(view: UpdateView) { if (this.closed) return; this.view = view; for (const fn of this.listeners) fn() }
  async call(method: string, payload: { operationId?: string; candidateId?: string; profileKey?: string } = {}): Promise<void> {
    const generation = ++this.generation
    try {
      const response = await this.connection.rpc.call('/api', `${NS}/update-${method}`, payload)
      if (!response.ok) {
        if (method === 'install' && ['busy', 'profile-changed'].some(code => response.error.code.endsWith('/' + code)) && generation === this.generation) {
          this.remember()
          this.publish({ ...this.view, status: 'failed', reason: response.error.code.endsWith('/profile-changed') ? 'profile-changed' : 'busy' }); return
        }
        throw new Error(response.error.code)
      }
      if (generation === this.generation) {
        const view = parse(response.value)
        if (view.profileKey !== this.profileKey) {
          const changedProfile = this.profileKey !== null
          this.profileKey = view.profileKey; this.operation = undefined
          if (this.profileKey) try { const stored = this.storage?.getItem(this.storageKey()); if (stored && uuid.test(stored)) this.operation = stored } catch { /* Optional storage. */ }
          if (changedProfile && payload.operationId) return await this.status()
        }
        // The Host latest receipt wins; browser storage only recovers a lost first reply.
        if (view.operation) this.remember(view.operation)
        else if (method === 'status' && !payload.operationId && this.operation && view.status !== 'unavailable') return await this.call('status', { operationId: this.operation })
        // A successful RPC response without an operation is an admission
        // refusal. The ID was stored before sending the request, so discard it
        // for every such outcome, including incompatibility and cancellation.
        else if (method === 'install') this.remember()
        this.publish(view)
      }
    } catch { if (generation === this.generation) this.publish({ ...this.view, status: method === 'install' || this.view.operation ? 'unknown' : 'failed', reason: 'connection' }) }
  }
  status = (): Promise<void> => this.call('status')
  async check() {
    if (this.busy || !this.profileKey) return
    this.busy = true; this.publish({ ...this.view, status: 'checking' })
    try { await this.call('check') } finally { this.busy = false }
  }
  async install() {
    if (this.busy || !this.profileKey || this.view.status !== 'available' || !this.view.candidate) return
    this.busy = true
    const payload = { profileKey: this.profileKey, candidateId: this.view.candidate.id, operationId: crypto.randomUUID() }
    this.remember(payload.operationId)
    this.publish({ ...this.view, status: 'installing', operation: payload.operationId })
    try { await this.call('install', payload) } finally { this.busy = false }
  }
  reset() { ++this.generation; this.busy = false; void this.status() }
  dispose() { this.closed = true; ++this.generation; this.listeners.clear() }
}
