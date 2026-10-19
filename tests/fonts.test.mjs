import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { fontFileName } from '../src/fonts.mjs'
import { fontFileNames } from '../src/font-files.mjs'

test('font routes accept only the shipped woff2 names', () => {
  assert.equal(fontFileName('/dsh-japanese/fonts/noto-sans-jp-0-wght-normal.woff2'), 'noto-sans-jp-0-wght-normal.woff2')
  assert.equal(fontFileName('/dsh-japanese/fonts/noto-sans-jp-119-wght-normal.woff2'), 'noto-sans-jp-119-wght-normal.woff2')
  assert.equal(fontFileName('/dsh-japanese/fonts/noto-sans-jp-latin-wght-normal.woff2'), 'noto-sans-jp-latin-wght-normal.woff2')
  assert.equal(fontFileName('/dsh-japanese/fonts/noto-sans-jp-latin-ext-wght-normal.woff2'), 'noto-sans-jp-latin-ext-wght-normal.woff2')
  assert.equal(fontFileName('/dsh-japanese/fonts/noto-sans-jp-cyrillic-wght-normal.woff2'), 'noto-sans-jp-cyrillic-wght-normal.woff2')
  assert.equal(fontFileName('/dsh-japanese/fonts/noto-sans-jp-vietnamese-wght-normal.woff2'), 'noto-sans-jp-vietnamese-wght-normal.woff2')
  assert.equal(fontFileName('/dsh-japanese/fonts/../index.js'), undefined)
  assert.equal(fontFileName('/dsh-japanese/fonts/noto-sans-jp-0-wght-normal.woff2.txt'), undefined)
  assert.equal(fontFileName('/dsh-japanese/fonts/noto-sans-jp-latin-extra-wght-normal.woff2'), undefined)
  assert.equal(fontFileName('/dsh-japanese/fonts/%2e%2e/index.js'), undefined)
  assert.equal(fontFileName('/assets/noto-sans-jp-0-wght-normal.woff2'), undefined)
})

test('every font URL in the client CSS names a file the route will serve', async () => {
  const client = await readFile(new URL('../dist/client.js', import.meta.url), 'utf8')
  const urls = [...client.matchAll(/url\((\/dsh-japanese\/fonts\/[^)]+)\)/g)].map(match => match[1])
  const shipped = new Set(await readdir(new URL('../dist/fonts', import.meta.url)))
  assert.ok(urls.length > 0)
  assert.deepEqual([...new Set(urls.map(url => url.slice('/dsh-japanese/fonts/'.length)))].sort(), [...fontFileNames].sort())
  for (const url of urls) {
    const name = fontFileName(url)
    assert.equal(name, url.slice('/dsh-japanese/fonts/'.length), url)
    assert.ok(shipped.has(name), name)
  }
})
