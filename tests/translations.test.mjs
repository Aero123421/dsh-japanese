import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'

const contract = JSON.parse(await readFile(new URL('./fixtures/upstream-dictionaries.json', import.meta.url), 'utf8'))
const placeholders = text => [...text.matchAll(/\{([A-Za-z][\w.]*)\}/g)].map(match => match[1]).sort()
test('all pinned official UI keys and placeholders have Japanese translations', async () => {
  for (const [namespace, english] of Object.entries(contract)) {
    const japanese = JSON.parse(await readFile(new URL(`../translations/${namespace}.json`, import.meta.url), 'utf8'))
    assert.deepEqual(Object.keys(japanese).sort(), Object.keys(english).sort(), namespace)
    for (const [key, text] of Object.entries(english)) {
      assert.equal(typeof japanese[key], 'string', `${namespace}/${key}`)
      assert.deepEqual(placeholders(japanese[key]), placeholders(text), `${namespace}/${key}`)
      assert.equal(japanese[key].includes('Harnova'), false, `${namespace}/${key}`)
    }
  }
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
  assert.ok(client.includes('data:font/woff2;base64,'))
  assert.ok(!/url\(https?:/.test(client))
  assert.ok((await readFile('dist/Noto-Sans-JP-OFL.txt', 'utf8')).includes('SIL OPEN FONT LICENSE'))
  assert.ok((await readdir('translations')).length >= 50)
})
