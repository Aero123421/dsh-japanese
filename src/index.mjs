import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { evaluatePluginCompatibility, getDshRuntimeVersion } from '@deepseek-ai/dsh-app-boot'
import { Updates } from './updates.ts'
import { VERSION } from './version.ts'
import { FONT_ROUTE, fontFileName } from './fonts.mjs'

// Map a published app-boot compatibility result to unmet requirements.
// app-boot 0.2.1-alpha.2 named them `peers`; rc.2 renamed them to `requirements`.
function publishedDshRequirements(issue) {
  if (!issue || issue.exempted === true) return {}
  return issue.requirements ?? issue.peers ?? {}
}
export function apply(ctx) {
  // Delegate the boot-time compatibility decision to the host's published evaluator; updates.ts keeps the same rule as the fallback.
  const updates = new Updates(() => ctx.get('pluginManager'), ctx.get('profileContext')?.dir, VERSION, getDshRuntimeVersion(), fetch, undefined, (manifest, runtime) => {
    try {
      // Host-granted exemptions are not published here, so an exempted mismatch stays manual.
      return publishedDshRequirements(evaluatePluginCompatibility(manifest, {}, runtime))
    } catch { throw new Error('metadata') }
  })
  ctx.effect(() => () => updates.dispose())
  // Connection authenticates these routes just like the standard management UI.
  // Missing services only remove updating; Client dictionaries remain independent.
  // The font files are public OFL assets. A named route is reachable with the
  // page cookie and also without one, so a path-preserving public URL can load
  // them. The stylesheet only references this path while html lang is ja.
  ctx.inject(['webServer'], child => {
    const directory = fileURLToPath(new URL('./fonts/', import.meta.url))
    child.effect(() => child.webServer.register({
      kind: 'prefix',
      path: FONT_ROUTE,
      async handler(request, response) {
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          response.writeHead(405)
          response.end()
          return
        }
        let pathname = '/'
        try { pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname } catch { /* malformed URL */ }
        const name = fontFileName(pathname)
        if (name === undefined) {
          response.writeHead(404)
          response.end()
          return
        }
        try {
          const body = await readFile(join(directory, name))
          response.writeHead(200, {
            'content-type': 'font/woff2',
            'content-length': String(body.length),
            'cache-control': 'public, max-age=31536000, immutable',
          })
          if (request.method === 'HEAD') response.end()
          else response.end(body)
        } catch {
          if (!response.headersSent) {
            response.writeHead(404)
            response.end()
          }
        }
      },
    }), 'dsh-japanese: fonts')
  })
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
