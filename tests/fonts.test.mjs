import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fontFileName } from '../src/fonts.mjs'

test('font routes accept only the shipped woff2 names', () => {
  assert.equal(fontFileName('/dsh-japanese/fonts/noto-sans-jp-0-wght-normal.woff2'), 'noto-sans-jp-0-wght-normal.woff2')
  assert.equal(fontFileName('/dsh-japanese/fonts/noto-sans-jp-119-wght-normal.woff2'), 'noto-sans-jp-119-wght-normal.woff2')
  assert.equal(fontFileName('/dsh-japanese/fonts/../index.js'), undefined)
  assert.equal(fontFileName('/dsh-japanese/fonts/noto-sans-jp-0-wght-normal.woff2.txt'), undefined)
  assert.equal(fontFileName('/dsh-japanese/fonts/%2e%2e/index.js'), undefined)
  assert.equal(fontFileName('/assets/noto-sans-jp-0-wght-normal.woff2'), undefined)
})
