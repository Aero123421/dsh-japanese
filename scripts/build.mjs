import { build } from 'esbuild'
import { mkdir, readFile, writeFile, copyFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'

await mkdir('.cache', { recursive: true })
await mkdir('dist', { recursive: true })
const fontRoot = resolve('node_modules/@fontsource-variable/noto-sans-jp')
let fontCss = await readFile(resolve(fontRoot, 'wght.css'), 'utf8')
for (const match of [...fontCss.matchAll(/url\(([^)]+)\)/g)]) {
  const font = await readFile(resolve(fontRoot, match[1].replaceAll("'", '').replaceAll('"', '')))
  fontCss = fontCss.replace(match[0], `url(data:font/woff2;base64,${font.toString('base64')})`)
}
fontCss = fontCss.replaceAll('Noto Sans JP Variable', 'DSH Japanese UI')
await writeFile('.cache/font-css.mjs', `export default ${JSON.stringify(fontCss)};\n`)
const translations = {}
for (const file of await readdir('translations')) {
  if (file.endsWith('.json') && file !== 'index.json') {
    translations[file.slice(0, -5)] = JSON.parse(await readFile(`translations/${file}`, 'utf8'))
  }
}
await writeFile('.cache/translations.json', JSON.stringify(translations))
const manifest = JSON.parse(await readFile('package.json', 'utf8'))
await build({ entryPoints: ['src/index.mjs'], outfile: 'dist/index.js', bundle: true, platform: 'node', format: 'esm', target: 'node22' })
const client = await build({ entryPoints: ['src/client.jsx'], bundle: true, platform: 'browser', format: 'cjs', target: 'es2022', write: false, loader: { '.css': 'text' }, minify: true })
await writeFile('dist/client.js', `window.__ModuleLoader__.load({id:${JSON.stringify(manifest.name)},factory(require){const module={exports:{}};const exports=module.exports;\n${client.outputFiles[0].text}\nreturn module.exports;}});\n`)
await copyFile(resolve(fontRoot, 'LICENSE'), 'dist/Noto-Sans-JP-OFL.txt')
console.log(`${manifest.name}: built`)
