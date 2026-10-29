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
      getSnapshot: () => ({ locales: [...locales] }),
      subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
      addLanguage: definition => {
        if (locales.some(locale => locale.id === definition.id)) throw new Error(`${definition.id} is already registered`)
        const entry = { ...definition }
        locales = [...locales, entry]
        publish()
        return () => {
          locales = locales.filter(locale => locale !== entry)
          publish()
        }
      },
    },
    drop(id) {
      locales = locales.filter(locale => locale.id !== id)
      publish()
    },
    replace(definition) {
      locales = [...locales.filter(locale => locale.id !== definition.id), { ...definition }]
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

test('dictionaries follow language ownership through late acquisition, replacement, and unload', () => {
  const host = catalog()
  let acquisitions = 0, releases = 0
  const other = host.locale.addLanguage({ id: 'ja', label: 'DSH Japanese', fallback: 'en' })
  const stop = watchJapaneseLanguage({ locale: host.locale }, () => {
    acquisitions++
    return () => { releases++ }
  })
  assert.equal(acquisitions, 0, 'existing Japanese provider keeps all dictionaries')
  other()
  assert.equal(acquisitions, 1, 'acquire dictionaries after the provider disappears')
  host.replace({ id: 'ja', label: 'replacement', fallback: 'en' })
  assert.equal(releases, 1, 'release our dictionaries on language replacement')
  assert.equal(host.snapshot()[0].label, 'replacement')
  host.drop('ja')
  assert.equal(acquisitions, 2)
  stop()
  stop()
  assert.equal(releases, 2)
  assert.deepEqual(host.snapshot(), [])
  host.locale.addLanguage({ id: 'ja', label: 'after unload', fallback: 'en' })
  assert.equal(acquisitions, 2, 'unloaded pack must not reacquire dictionaries')
})
