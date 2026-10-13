interface Connection { rpc: { call(base: string, method: string, payload: unknown): Promise<{ ok: true; value: unknown } | { ok: false; error: { code: string } }> } }
import type { UpdateView } from './updates.ts'
import { VERSION } from './version.ts'
const NS = 'dsh-japanese-updates'
const statuses = ['idle', 'available', 'current', 'unavailable', 'incompatible', 'checking', 'installing', 'unknown', 'restart-required', 'applied', 'overridden', 'failed', 'cancelled']
function parse(value: unknown): UpdateView {
  if (!value || typeof value !== 'object' || !('status' in value) || !statuses.includes(String(value.status)) || !('running' in value) || typeof value.running !== 'string') throw new Error('invalid-response')
  const view = value as UpdateView
  if (view.candidate && (typeof view.candidate.id !== 'string' || typeof view.candidate.version !== 'string' || typeof view.candidate.url !== 'string' || !view.candidate.url.startsWith('https://github.com/Aero123421/dsh-japanese/releases/tag/v') || typeof view.candidate.notes !== 'string' || typeof view.candidate.runtime !== 'string')) throw new Error('invalid-response')
  return view
}
export class UpdateController {
  private view: UpdateView = { status: 'idle', running: VERSION }
  private listeners = new Set<() => void>()
  private generation = 0
  private closed = false
  private busy = false
  private operation?: string | undefined
  private readonly storageKey = 'dsh.japanesePack.updateOperation'
  private readonly connection: Connection
  constructor(connection: Connection) {
    this.connection = connection
    try { const stored = globalThis.localStorage?.getItem(this.storageKey); if (stored && /^[0-9a-f-]{36}$/.test(stored)) this.operation = stored } catch { /* Storage may be unavailable. The Host also journals installations. */ }
  }
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
  getSnapshot = () => this.view
  private publish(view: UpdateView) { if (this.closed) return; this.view = view; for (const fn of this.listeners) fn() }
  async call(method: string, payload = {}) {
    const generation = ++this.generation
    try {
      const response = await this.connection.rpc.call('/api', `${NS}/update-${method}`, payload)
      if (!response.ok) {
        if (method === 'install' && response.error.code.endsWith('/busy') && generation === this.generation) {
          this.operation = undefined
          try { globalThis.localStorage?.removeItem(this.storageKey) } catch { /* Optional storage. */ }
          this.publish({ ...this.view, status: 'failed', reason: 'busy' }); return
        }
        throw new Error(response.error.code)
      }
      if (generation === this.generation) {
        const view = parse(response.value)
        if (view.operation) { this.operation = view.operation; try { globalThis.localStorage?.setItem(this.storageKey, view.operation) } catch { /* Optional storage. */ } }
        this.publish(view)
      }
    } catch { if (generation === this.generation) this.publish({ ...this.view, status: method === 'install' || this.view.operation ? 'unknown' : 'failed', reason: 'connection' }) }
  }
  status = () => this.call('status', this.operation ? { operationId: this.operation } : {})
  async check() {
    if (this.busy) return
    this.busy = true; this.publish({ ...this.view, status: 'checking' })
    try { await this.call('check') } finally { this.busy = false }
  }
  async install() {
    if (this.busy || this.view.status !== 'available' || !this.view.candidate) return
    this.busy = true
    const payload = { candidateId: this.view.candidate.id, operationId: crypto.randomUUID() }
    this.operation = payload.operationId
    try { globalThis.localStorage?.setItem(this.storageKey, payload.operationId) } catch { /* Host journal is authoritative after request admission. */ }
    this.publish({ ...this.view, status: 'installing', operation: payload.operationId })
    try { await this.call('install', payload) } finally { this.busy = false }
  }
  reset() { ++this.generation; this.busy = false; void this.status() }
  dispose() { this.closed = true; ++this.generation; this.listeners.clear() }
}
