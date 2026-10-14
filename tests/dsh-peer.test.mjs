import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { assertOfflinePeers, satisfiesRuntime, versionFromReleases } from '../scripts/check-dsh-compat.mjs'

const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

test('DSH peers cover 0.2.1-alpha.2 through later 0.2.x prereleases and stop before 0.3', () => {
  // 0.2.0-rc.2 is outside the versions this pack is built and checked against.
  // <0.3.0-0, not <0.3.0: app-boot uses semver.satisfies with includePrerelease,
  // and <0.3.0 would admit 0.3.0-alpha.1.
  assert.equal(assertOfflinePeers(manifest), '>=0.2.1-alpha.2 <0.3.0-0')
  assert.equal(satisfiesRuntime('0.3.0-alpha.1', '>=0.2.1-alpha.2 <0.3.0'), true)
  assert.equal(satisfiesRuntime('0.2.1-alpha.3', '0.2.1-alpha.2'), false)
})

test('published DSH release tags parse without treating drafts as the runtime', () => {
  assert.deepEqual(versionFromReleases([
    { draft: true, tag_name: 'dsh-v9.0.0' },
    { draft: false, tag_name: 'dsh-v0.2.1-alpha.3' },
  ]), { version: '0.2.1-alpha.3', tag: 'dsh-v0.2.1-alpha.3' })
  assert.throws(() => versionFromReleases([{ draft: false, tag_name: 'not-a-version' }]), /no published DSH release/)
})
