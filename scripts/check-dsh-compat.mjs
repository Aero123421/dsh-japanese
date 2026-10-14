import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import semver from 'semver'

const manifestUrl = new URL('../package.json', import.meta.url)
const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'))

export function dshPeers(pkg = manifest) {
  return Object.entries(pkg.peerDependencies ?? {}).filter(([name]) => name === '@deepseek-ai/dsh' || name.startsWith('@deepseek-ai/dsh-'))
}

// Same options as app-boot evaluatePluginCompatibility: prereleases participate.
export function satisfiesRuntime(version, range) {
  return semver.satisfies(version, range, { includePrerelease: true })
}

export function assertOfflinePeers(pkg = manifest) {
  const peers = dshPeers(pkg)
  if (!peers.length) throw new Error('missing @deepseek-ai/dsh* peerDependencies')
  const range = peers[0][1]
  if (typeof range !== 'string' || peers.some(([, value]) => value !== range)) throw new Error('dsh peer ranges differ')
  if (semver.valid(range)) throw new Error(`dsh peer ${range} is an exact version and will be skipped on the next DSH release`)
  if (!semver.validRange(range)) throw new Error('dsh peer range is invalid')
  const accept = ['0.2.1-alpha.2', '0.2.1-alpha.3', '0.2.1-alpha.10', '0.2.1', '0.2.2-alpha.1', '0.2.9']
  const reject = ['0.2.1-alpha.1', '0.2.0-rc.2', '0.2.0', '0.3.0-0', '0.3.0-alpha.1', '0.3.0', '0.1.7-alpha.1']
  for (const version of accept) {
    if (!satisfiesRuntime(version, range)) throw new Error(`${range} rejects ${version}`)
  }
  for (const version of reject) {
    if (satisfiesRuntime(version, range)) throw new Error(`${range} accepts ${version}`)
  }
  return range
}

export function versionFromReleases(releases) {
  if (!Array.isArray(releases)) throw new Error('release list')
  for (const release of releases) {
    if (!release || typeof release !== 'object' || release.draft === true) continue
    const tag = typeof release.tag_name === 'string' ? release.tag_name : ''
    const version = tag.startsWith('dsh-v') ? tag.slice('dsh-v'.length) : tag.startsWith('v') ? tag.slice(1) : ''
    if (semver.valid(version)) return { version, tag }
  }
  throw new Error('no published DSH release')
}

export async function latestDshRelease(fetcher = fetch) {
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'dsh-japanese-compat' }
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  if (token) headers.authorization = `Bearer ${token}`
  const response = await fetcher('https://api.github.com/repos/deepseek-ai/deepseek-harness/releases?per_page=20', { headers, redirect: 'error' })
  if (!response.ok) throw new Error(`DSH release list failed: ${response.status}`)
  return versionFromReleases(await response.json())
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  const range = assertOfflinePeers()
  if (process.argv.includes('--online')) {
    const { version, tag } = await latestDshRelease()
    if (!satisfiesRuntime(version, range)) {
      console.error(`DSH ${tag} (${version}) does not satisfy peerDependencies ${range}. Boot skips this plugin until the range is updated.`)
      process.exit(1)
    }
    console.log(`DSH ${tag} (${version}) satisfies ${range}`)
  }
}
