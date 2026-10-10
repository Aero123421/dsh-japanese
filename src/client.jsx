import dictionaries from '../../../.cache/translations.json'
import fontCss from '../../../.cache/font-css.mjs'

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
  if (!ctx.locale.getSnapshot().locales.some(locale => locale.id === 'ja')) {
    ctx.effect(() => ctx.locale.addLanguage({ id: 'ja', label: '日本語', fallback: 'en' }), 'dsh-japanese: language')
  }
  for (const [namespace, dictionary] of Object.entries(dictionaries)) {
    ctx.effect(() => ctx.locale.register(namespace, 'ja', dictionary), `dsh-japanese: ${namespace}`)
  }
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.dshJapanese = ''
    style.textContent = fontCss + japaneseTypography
    document.head.append(style)
    return () => style.remove()
  }, 'dsh-japanese: bundled typography')
}
