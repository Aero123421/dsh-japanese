import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'

const contract = JSON.parse(await readFile(new URL('./fixtures/upstream-dictionaries.json', import.meta.url), 'utf8'))
const versions = [
  ['0.2.1-alpha.2', JSON.parse(await readFile(new URL('./fixtures/en-by-version/0.2.1-alpha.2.json', import.meta.url), 'utf8'))],
  ['0.2.1-alpha.3', JSON.parse(await readFile(new URL('./fixtures/en-by-version/0.2.1-alpha.3.json', import.meta.url), 'utf8'))],
  ['0.2.1-rc.2', contract],
]
const placeholders = text => [...text.matchAll(/\{([A-Za-z][\w.]*)\}/g)].map(match => match[1]).sort()
test('all pinned official UI keys and placeholders have Japanese translations', async () => {
  for (const [namespace, english] of Object.entries(contract)) {
    const japanese = JSON.parse(await readFile(new URL(`../translations/${namespace}.json`, import.meta.url), 'utf8'))
    assert.deepEqual(Object.keys(japanese).sort(), Object.keys(english).sort(), namespace)
    for (const [key, text] of Object.entries(english)) {
      assert.equal(typeof japanese[key], 'string', `${namespace}/${key}`)
      assert.doesNotMatch(japanese[key], /harnova/i, `${namespace}/${key}`)
    }
  }
})
test('Japanese placeholders are valid in each supported version en dictionary', async () => {
  // alpha.2 and alpha.3 pass {peers}; rc.2 passes {requirements}. alpha.2's
  // restart sentences have no {reason}. One Japanese sentence omits a name
  // that is not in every version's English, and keeps every name that is.
  const japanese = {}
  for (const file of await readdir(new URL('../translations/', import.meta.url))) {
    if (!file.endsWith('.json') || file === 'index.json') continue
    japanese[file.slice(0, -5)] = JSON.parse(await readFile(new URL(`../translations/${file}`, import.meta.url), 'utf8'))
  }
  for (const [namespace, dictionary] of Object.entries(japanese)) {
    for (const [key, text] of Object.entries(dictionary)) {
      const present = versions.flatMap(([version, english]) => {
        const source = english[namespace]?.[key]
        return source === undefined ? [] : [[version, placeholders(source)]]
      })
      if (present.length === 0) continue
      const shared = present.map(([, names]) => names).reduce((left, right) => left.filter(name => right.includes(name)))
      const translated = placeholders(text)
      assert.deepEqual(translated.filter(name => shared.includes(name)), shared, `${namespace}/${key} shared placeholders`)
      for (const [version, names] of present) {
        for (const name of translated) assert.ok(names.includes(name), `${version} ${namespace}/${key} ja {${name}} is not in that version's en`)
      }
    }
  }
  const incompatible = versions.map(([version, english]) => [version, placeholders(english.pluginManager.reasonIncompatibleVersion)])
  assert.deepEqual(incompatible, [
    ['0.2.1-alpha.2', ['peers', 'plugin', 'runtime']],
    ['0.2.1-alpha.3', ['peers', 'plugin', 'runtime']],
    ['0.2.1-rc.2', ['plugin', 'requirements', 'runtime']],
  ])
  assert.deepEqual(placeholders(japanese.pluginManager.reasonIncompatibleVersion), ['plugin', 'runtime'])
})
test('the standalone bundle registers its ID and includes offline font licensing', async () => {
  const manifest = JSON.parse(await readFile('package.json', 'utf8'))
  const client = await readFile('dist/client.js', 'utf8')
  assert.ok(client.startsWith(`window.__ModuleLoader__.load({id:${JSON.stringify(manifest.name)}`))
  assert.ok(manifest.dsh.bundle.patch)
  for (const language of ['en', 'ja']) {
    const metadata = JSON.parse(await readFile(`locale/${language}.json`, 'utf8'))
    assert.equal(typeof metadata.meta.title, 'string')
    assert.equal(typeof metadata.meta.description, 'string')
  }
  assert.ok(!client.includes('data:font/woff2;base64,'))
  assert.ok(client.includes('/dsh-japanese/fonts/noto-sans-jp-'))
  assert.ok(!/url\(https?:/.test(client))
  assert.ok((await readFile('dist/Noto-Sans-JP-OFL.txt', 'utf8')).includes('SIL OPEN FONT LICENSE'))
  assert.ok((await readdir('translations')).length >= 50)
})
