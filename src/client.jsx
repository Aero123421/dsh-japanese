import { registerUpdatePage } from './update-page.jsx'
import { registerJapaneseDictionaries } from './register-dictionaries.mjs'
import { watchJapaneseLanguage } from './language.mjs'
import dictionaries from '../.cache/translations.json'
import fontCss from '../.cache/font-css.mjs'

export const inject = ['locale']

export const japaneseTypography = `
html:lang(ja) body {
  --dsh-font-family-text-default: 'DSH Japanese UI', sans-serif;
  --dsw-font-family: var(--dsh-font-family-text, 'DSH Japanese UI'), 'DSH Japanese UI', sans-serif;
  --dsw-font-family-brand: 'Montserrat', var(--dsw-font-family);
  --ds-font-family-code: var(--dsh-font-family-code, 'SF Mono', 'JetBrains Mono', 'Fira Code', Consolas, 'Liberation Mono', Menlo, Courier), 'DSH Japanese UI', sans-serif;
}
`

export function apply(ctx) {
  ctx.inject(['slots', 'connection'], child => registerUpdatePage(child))
  ctx.effect(() => watchJapaneseLanguage(ctx), 'dsh-japanese: language')
  registerJapaneseDictionaries(ctx, dictionaries)
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.dshJapanese = ''
    const paint = () => {
      // @font-face stays out of the document until Japanese is the active language,
      // so the browser does not request the woff2 files for English or Chinese.
      style.textContent = document.documentElement?.lang === 'ja' ? fontCss + japaneseTypography : ''
    }
    paint()
    const unsubscribe = ctx.locale.subscribe(paint)
    const observer = typeof MutationObserver === 'function'
      ? new MutationObserver(paint)
      : undefined
    observer?.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
    document.head.append(style)
    return () => {
      unsubscribe()
      observer?.disconnect()
      style.remove()
    }
  }, 'dsh-japanese: bundled typography')
}
