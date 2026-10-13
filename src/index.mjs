import { getDshRuntimeVersion } from '@deepseek-ai/dsh-app-boot'
import { Updates } from './updates.ts'
import { VERSION } from './version.ts'

export function apply(ctx) {
  const updates = new Updates(() => ctx.get('pluginManager'), ctx.get('profileContext')?.dir, VERSION, getDshRuntimeVersion())
  ctx.effect(() => () => updates.dispose())
  // Connection authenticates these routes just like the standard management UI.
  // Missing services only remove updating; Client dictionaries remain independent.
  ctx.inject(['connection'], child => {
    for (const method of ['status', 'check', 'install']) {
      const endpoint = `dsh-japanese-updates/update-${method}`
      child.connection.fetch.register({ path: `/api/${endpoint}`, methods: ['POST'], requestBody: 'buffered', async fetch(request) {
        let rpcId
        try {
          if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return new Response('unsupported media type', { status: 415 })
          const envelope = await request.json()
          if (!envelope || envelope.type !== 'client-request' || typeof envelope.rpcId !== 'string' || envelope.rpcId.length > 100 || envelope.method !== endpoint || !envelope.payload || typeof envelope.payload !== 'object' || Array.isArray(envelope.payload)) return new Response('invalid request', { status: 400 })
          rpcId = envelope.rpcId; request.signal.throwIfAborted()
          const value = method === 'status' ? await updates.status(envelope.payload.operationId) : method === 'check' ? await updates.check() : await updates.install(envelope.payload.candidateId, envelope.payload.operationId, envelope.payload.profileKey)
          return Response.json({ type: 'server-response', rpcId, result: { ok: true, value } }, { headers: { 'cache-control': 'no-store' } })
        } catch (error) {
          if (rpcId === undefined) return new Response('invalid request', { status: 400 })
          return Response.json({ type: 'server-response', rpcId, result: { ok: false, error: { code: `dsh-japanese-updates/${error instanceof Error && ['busy', 'profile-changed'].includes(error.message) ? error.message : 'unavailable'}`, message: 'unavailable', details: {} } } }, { headers: { 'cache-control': 'no-store' } })
        }
      } })
    }
  })
}
