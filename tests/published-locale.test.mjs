import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const require = createRequire(import.meta.url)
const publishedClient = process.env.DSH_PUBLISHED_LOCALE_CLIENT

// The locale implementation and its bundled Japanese dictionaries are real
// published code. DOM, settings transport, and UI rendering are not exercised.
test('published DSH locale preserves dictionary ownership before and after the pack loads', { skip: !publishedClient }, async () => {
  let localeFactory, packFactory
  const styles = [], effects = [], errors = []
  const document = { documentElement: { lang: 'en' }, createElement: () => ({ dataset: {}, textContent: '', remove() { styles.splice(styles.indexOf(this), 1) } }), head: { append: node => styles.push(node) } }
  const sandbox = { navigator: { languages: ['en'], language: 'en' }, window: { __ModuleLoader__: { load: entry => { localeFactory = entry.factory } } } }
  vm.runInNewContext(await readFile(publishedClient, 'utf8'), sandbox)
  const official = localeFactory(id => {
    if (id === '@deepseek-ai/dsh-client-ui-primitives') return {}
    if (id === '@deepseek-ai/dsh-client-store') return { defineStore: definition => definition }
    return require(id)
  })
  const ctx = {
    emit() {},
    effect(callback) { const dispose = callback(); effects.push(dispose); return dispose },
    configForms: { get: () => undefined },
    slots: { installLocale() {}, inject() {} },
    provide(name, value) { this[name] = value },
    inject() {},
  }
  await official.apply(ctx)
  const nativeJapanese = ctx.locale.getSnapshot().locales.some(locale => locale.id === 'ja')
  const originalCancel = ctx.locale.bind('common')('cancel')

  vm.runInNewContext(await readFile('dist/client.js', 'utf8'), { window: { __ModuleLoader__: { load: entry => { packFactory = entry.factory } } }, document, console: { error: message => errors.push(message) } })
  const plugin = packFactory(require)
  for (let cycle = 0; cycle < 2; cycle++) {
    const before = effects.length
    plugin.apply(ctx)
    ctx.locale.setLocale('ja')
    assert.equal(styles.length, 1)
    assert.notEqual(ctx.locale.bind('common')('cancel'), 'cancel')
    assert.notEqual(ctx.locale.bind('common')('cancel'), 'Cancel')
    // Official UI plugins can load after the immediately activated pack.
    const removeLate = ctx.locale.register('pluginManager', { en: { versionsTitle: 'Versions' }, ...(nativeJapanese ? { ja: { versionsTitle: 'バージョン' } } : {}) })
    assert.equal(ctx.locale.bind('pluginManager')('versionsTitle'), nativeJapanese ? 'バージョン' : 'Versions')
    for (const dispose of effects.splice(before).reverse()) dispose?.()
    assert.equal(styles.length, 0)
    assert.equal(ctx.locale.getSnapshot().active, nativeJapanese ? 'ja' : 'en')
    assert.equal(ctx.locale.bind('common')('cancel'), nativeJapanese ? 'キャンセル' : originalCancel)
    assert.equal(ctx.locale.bind('pluginManager')('versionsTitle'), nativeJapanese ? 'バージョン' : 'Versions')
    removeLate()
  }
  assert.deepEqual(errors, [])
  for (const dispose of effects.reverse()) dispose?.()
})
