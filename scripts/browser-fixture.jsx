import React, { useSyncExternalStore } from 'react'
import { Context } from '@deepseek-ai/cordis'
import { apply as renderer } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'

const factories = new Map()
window.__ModuleLoader__ = { load: ({ id, factory }) => factories.set(id, factory) }
window.mountPlugin = async () => {
  const ctx = new Context()
  const locale = new LocaleRuntime(ctx)
  ctx.provide('locale', locale)
  const root = ctx.plugin(renderer); await root.await()
  const absent = Object.freeze({ key: undefined, hooks: {}, keyedHooks: {}, props: {} })
  const source = { getSnapshot: () => absent, subscribe: () => () => {} }
  ctx.slots.installScope('session', { current: source, bindingSource: () => source })
  ctx.slots.register({ name: 'root', id: 'japanese-fixture' }, () => {
    useSyncExternalStore(listener => locale.subscribe(listener), () => locale.getSnapshot().revision)
    return <main style={{ maxWidth: 720, margin: '32px auto', padding: 24, fontFamily: 'var(--dsw-font-family)', color: 'var(--dsw-alias-label-primary)' }}>
      <h1 style={{ fontSize: 22, fontWeight: 500 }}>DeepSeek Harness</h1>
      <h2 id="translated-title">{locale.bind('settings.models')('nav')}</h2>
      <p id="japanese-glyph-test">日本語の表示確認：設定・認証・骨・直・令・髙・辻</p>
    </main>
  })
  // Supply document.lang synchronization, normally set up by the locale plugin.
  const sync = () => { document.documentElement.lang = locale.getSnapshot().active }
  ctx.effect(() => locale.subscribe(sync))
  const plugin = factories.get('@local/dsh-japanese')(() => { throw new Error('Unexpected external') })
  const fiber = ctx.plugin(plugin); await fiber.await()
  locale.setLocale('ja'); sync()
  const unmount = ctx.uiRenderer.mount(document.getElementById('app'))
  window.testRuntime = { ctx, locale, unload: async () => { await fiber.dispose() }, dispose: async () => { unmount(); await root.dispose(); await ctx.fiber.dispose() } }
}
