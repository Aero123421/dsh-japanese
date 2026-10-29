/** Keep `ja` in the locale catalog while this plugin is applied.
 * `addLanguage` throws when the id already exists, and the owner that
 * registered it removes the entry on dispose. `subscribe` runs for that
 * catalog change, so this plugin registers `ja` again. Disposal unsubscribes
 * first, then removes only the entry this plugin added. Dictionaries belong to
 * the same language lease: a pre-existing Japanese provider (including DSH's
 * built-in translations) keeps its namespaces, even when they load later.
 * @param ctx - client context with `locale`.
 * @param onOwned - acquire dictionaries only while this plugin owns Japanese.
 * @returns disposer for `ctx.effect`.
 */
export function watchJapaneseLanguage(ctx, onOwned = () => {}) {
  let disposed = false
  let ensuring = false
  let remove
  let owned
  let releaseDictionaries
  const current = () => ctx.locale.getSnapshot().locales.find(locale => locale.id === 'ja')
  const release = () => {
    const dictionaries = releaseDictionaries
    const language = remove
    releaseDictionaries = remove = owned = undefined
    dictionaries?.()
    language?.()
  }
  const ensure = () => {
    if (disposed || ensuring) return
    ensuring = true
    try {
      // Locale snapshots retain immutable catalog definitions. A replacement
      // belongs to another provider; drop our dictionaries before proceeding.
      if (owned && current() !== owned) release()
      if (current()) return
      remove = ctx.locale.addLanguage({ id: 'ja', label: '日本語', fallback: 'en' })
      owned = current()
      releaseDictionaries = onOwned()
    } catch (error) {
      if (!current()) {
        const message = error instanceof Error ? error.message : 'addLanguage failed'
        console.error(`dsh-japanese: could not restore ja: ${message}`)
      }
    } finally { ensuring = false }
  }
  ensure()
  const unsubscribe = ctx.locale.subscribe(ensure)
  return () => {
    disposed = true
    unsubscribe()
    release()
  }
}
