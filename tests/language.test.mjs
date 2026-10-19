import { test } from 'node:test'
import assert from 'node:assert/strict'
import { watchJapaneseLanguage } from '../src/language.mjs'

function catalog() {
  let locales = []
  const listeners = new Set()
  const publish = () => { for (const listener of listeners) listener() }
  return {
    added: [],
    snapshot: () => locales.map(locale => ({ ...locale })),
    locale: {
      getSnapshot: () => ({ locales: locales.map(locale => ({ ...locale })) }),
      subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
      addLanguage: definition => {
        if (locales.some(locale => locale.id === definition.id)) throw new Error(`${definition.id} is already registered`)
        locales = [...locales, { id: definition.id, label: definition.label }]
        publish()
        return () => {
          locales = locales.filter(locale => locale.id !== definition.id)
          publish()
        }
      },
    },
    drop(id) {
      locales = locales.filter(locale => locale.id !== id)
      publish()
    },
  }
}

test('ja registered by another plugin is restored after that plugin removes it', () => {
  const host = catalog()
  const other = host.locale.addLanguage({ id: 'ja', label: '日本語', fallback: 'en' })
  const stop = watchJapaneseLanguage({ locale: host.locale })
  assert.deepEqual(host.snapshot().map(locale => locale.id), ['ja'])
  other()
  assert.deepEqual(host.snapshot().map(locale => locale.id), ['ja'])
  stop()
  assert.deepEqual(host.snapshot(), [])
})

test('this plugin does not replace ja it did not register, and does not restore ja after it is turned off', () => {
  const host = catalog()
  host.locale.addLanguage({ id: 'ja', label: 'other', fallback: 'en' })
  const stop = watchJapaneseLanguage({ locale: host.locale })
  assert.equal(host.snapshot()[0].label, 'other')
  stop()
  assert.equal(host.snapshot()[0].label, 'other')
})
