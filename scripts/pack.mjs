import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
await mkdir('artifacts', { recursive: true })
const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['pack', '--pack-destination', resolve('artifacts')], { stdio: 'inherit', shell: process.platform === 'win32' })
if (result.status !== 0) process.exit(result.status ?? 1)
const manifest = JSON.parse(await readFile('package.json', 'utf8'))
const filename = `${manifest.name.replace('@', '').replace('/', '-')}-${manifest.version}.tgz`
const hash = createHash('sha256').update(await readFile(resolve('artifacts', filename))).digest('hex')
await writeFile('artifacts/SHA256SUMS', `${hash}  ${filename}\n`)
