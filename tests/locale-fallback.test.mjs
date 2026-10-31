import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerJapaneseDictionaries } from '../src/register-dictionaries.mjs'

test('missing Japanese keys fall back to English, and one rejected namespace does not block the others', () => {
  const dicts = new Map()
  const errors = []
  const original = console.error
  console.error = (...args) => { errors.push(args.join(' ')) }
  const ctx = {
    effect(callback) { callback() },
    locale: {
      register(namespace, language, dictionary) {
        if (namespace === 'broken') throw new Error('locale namespace "broken" already has locale "ja"')
        const locales = dicts.get(namespace) ?? new Map()
        if (locales.has(language)) throw new Error('duplicate')
        locales.set(language, dictionary)
        dicts.set(namespace, locales)
        return () => { locales.delete(language) }
      },
      translate(namespace, key) {
        const locales = dicts.get(namespace)
        return locales?.get('ja')?.[key] ?? locales?.get('en')?.[key] ?? key
      },
    },
  }
  try {
    ctx.locale.register('chat', 'en', { title: 'Chat', fresh: 'New setting' })
    const stop = registerJapaneseDictionaries(ctx, {
      chat: { title: 'チャット' },
      broken: { title: '壊れた辞書' },
      workspace: { empty: '空' },
      bad: { title: 1 },
    })
    assert.equal(ctx.locale.translate('chat', 'title'), 'チャット')
    assert.equal(ctx.locale.translate('chat', 'fresh'), 'New setting')
    assert.equal(ctx.locale.translate('chat', 'absent'), 'absent')
    assert.equal(ctx.locale.translate('workspace', 'empty'), '空')
    assert.equal(dicts.has('broken'), false)
    assert.equal(dicts.has('bad'), false)
    assert.match(errors.join('\n'), /skipped Japanese dictionary broken/)
    stop()
    stop()
    assert.equal(ctx.locale.translate('chat', 'title'), 'Chat')
    assert.equal(ctx.locale.translate('workspace', 'empty'), 'empty')
  } finally { console.error = original }
})
