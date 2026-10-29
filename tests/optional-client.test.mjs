import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const require = createRequire(import.meta.url)
for (const nativeJapanese of [false, true]) test(`Without slots/connection the built Client preserves language and font ownership (native Japanese: ${nativeJapanese})`, async () => {
  let factory
  const foreignStyle = { foreign: true }, styles = [foreignStyle], disposers = [], injections = [], registrations = []
  const document = { documentElement: { lang: 'ja' }, createElement: () => ({ dataset: {}, textContent: '', remove() { styles.splice(styles.indexOf(this), 1) } }), head: { append: node => styles.push(node) } }
  vm.runInNewContext(await readFile('dist/client.js', 'utf8'), { window: { __ModuleLoader__: { load: entry => { factory = entry.factory } } }, document })
  const plugin = factory(require)
  assert.deepEqual([...plugin.inject], ['locale'])
  let active = 'en'
  let locales = [{ id: 'en' }, ...(nativeJapanese ? [{ id: 'ja' }] : [])]
  const ctx = { inject: deps => injections.push([...deps]), effect: callback => disposers.push(callback()), locale: { getSnapshot: () => ({ active, locales }), subscribe: () => () => {}, addLanguage: definition => { assert.equal(nativeJapanese, false, 'existing Japanese language must not be replaced'); locales = [...locales, definition]; return () => { locales = locales.filter(locale => locale !== definition) } }, register: (namespace, language) => { registrations.push({ namespace, language }); return () => {} } } }
  plugin.apply(ctx)
  assert.deepEqual(injections, [['slots', 'connection']])
  assert.ok(nativeJapanese ? registrations.length === 0 : registrations.length >= 50)
  assert.ok(registrations.every(entry => entry.language === 'ja'))
  assert.equal(styles.length, 2); assert.equal(active, 'en')
  assert.match(styles[1].textContent, /var\(--dsh-font-family-text,/)
  assert.match(styles[1].textContent, /var\(--dsh-font-family-code,/)
  for (const dispose of disposers.reverse()) dispose?.()
  assert.deepEqual(styles, [foreignStyle]); assert.equal(active, 'en')
})
