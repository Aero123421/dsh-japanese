/** Keep `ja` in the locale catalog while this plugin is applied.
 * `addLanguage` throws when the id already exists, and the owner that
 * registered it removes the entry on dispose. `subscribe` runs for that
 * catalog change, so this plugin registers `ja` again. Disposal unsubscribes
 * first, then removes only the entry this plugin added.
 * @param ctx - client context with `locale`.
 * @returns disposer for `ctx.effect`.
 */
export function watchJapaneseLanguage(ctx) {
  let disposed = false
  let remove
  const present = () => ctx.locale.getSnapshot().locales.some(locale => locale.id === 'ja')
  const ensure = () => {
    if (disposed || present()) return
    try {
      remove = ctx.locale.addLanguage({ id: 'ja', label: '日本語', fallback: 'en' })
    } catch (error) {
      if (!present()) {
        const message = error instanceof Error ? error.message : 'addLanguage failed'
        console.error(`dsh-japanese: could not restore ja: ${message}`)
      }
    }
  }
  ensure()
  const unsubscribe = ctx.locale.subscribe(ensure)
  return () => {
    disposed = true
    unsubscribe()
    const current = remove
    remove = undefined
    current?.()
  }
}
