import * as ReactDom from 'react-dom'
import * as ReactJsxRuntime from 'react/jsx-runtime'
import React, { useSyncExternalStore } from 'react'
import { Context } from '@deepseek-ai/cordis'
import { apply as renderer } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { VERSION } from '../src/version.ts'

const factories = new Map()
window.__ModuleLoader__ = { load: ({ id, factory }) => factories.set(id, factory) }
window.mountPlugin = async () => {
  const ctx = new Context()
  const locale = new LocaleRuntime(ctx)
  ctx.provide('locale', locale)
  let installs = 0, updateState = 'unavailable', updateReason = '', updateRequirements
  if (!location.search.includes('no-connection')) ctx.provide('connection', { rpc: { call: async (_base, method, payload) => {
    if (method.endsWith('update-install')) { installs++; updateState = 'restart-required'; updateReason = '' }
    return { ok: true, value: { status: updateState, running: VERSION, profileKey: 'a'.repeat(64), ...(updateReason ? { reason: updateReason, stage: 'install' } : {}), ...(updateRequirements ? { requirements: updateRequirements } : {}), ...(updateState === 'available' ? { candidate: { id: 'fixture', version: '0.3.0', notes: '更新の説明', url: 'https://github.com/Aero123421/dsh-japanese/releases/tag/v0.3.0', runtime: '0.2.1-alpha.2' } } : {}), ...(payload.operationId ? { operation: payload.operationId } : {}) } }
  } } })
  const root = ctx.plugin(renderer); await root.await()
  const absent = Object.freeze({ key: undefined, hooks: {}, keyedHooks: {}, props: {} })
  const source = { getSnapshot: () => absent, subscribe: () => () => {} }
  ctx.slots.installScope('session', { current: source, bindingSource: () => source })
  ctx.slots.register({ name: 'root', id: 'japanese-fixture', children: { 'settings.section': { kind: 'list', scope: 'root' } } }, ({ renderSlot }) => {
    useSyncExternalStore(listener => locale.subscribe(listener), () => locale.getSnapshot().revision)
    return <main style={{ maxWidth: 720, margin: '32px auto', padding: 24, fontFamily: 'var(--dsw-font-family)', color: 'var(--dsw-alias-label-primary)' }}>
      <h1 style={{ fontSize: 22, fontWeight: 500 }}>DeepSeek Harness</h1>
      <h2 id="translated-title">{locale.bind('settings.models')('nav')}</h2>
      {renderSlot('settings.section', {})}
      <p id="japanese-glyph-test">日本語の表示確認：設定・認証・骨・直・令・髙・辻</p>
    </main>
  })
  // Supply document.lang synchronization, normally set up by the locale plugin.
  const sync = () => { document.documentElement.lang = locale.getSnapshot().active }
  ctx.effect(() => locale.subscribe(sync))
  const shared = { react: React, 'react-dom': ReactDom, 'react/jsx-runtime': ReactJsxRuntime }
  const plugin = factories.get('@local/dsh-japanese')(specifier => { if (specifier in shared) return shared[specifier]; throw new Error('Unexpected external') })
  const fiber = ctx.plugin(plugin); await fiber.await()
  locale.setLocale(location.search.includes('lang=en') ? 'en' : 'ja'); sync()
  const unmount = ctx.uiRenderer.mount(document.getElementById('app'))
  window.testRuntime = { ctx, locale, installs: () => installs, setUpdate: async (status, reason = '', requirements) => { updateState = status; updateReason = reason; updateRequirements = requirements; ctx.emit('connection/reset') }, unload: async () => { await fiber.dispose() }, dispose: async () => { unmount(); await root.dispose(); await ctx.fiber.dispose() } }
}
