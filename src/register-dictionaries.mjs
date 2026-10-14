function stringDictionary(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.values(value).every(item => typeof item === 'string')
}

// Japanese dictionaries are partial overlays. Keys this pack does not have yet
// stay unregistered so Locale walks ja, then en, then the key. One namespace
// that cannot be registered leaves the font and the other dictionaries in place.
export function registerJapaneseDictionaries(ctx, dictionaries) {
  for (const [namespace, dictionary] of Object.entries(dictionaries)) {
    if (!stringDictionary(dictionary)) continue
    ctx.effect(() => {
      try {
        const dispose = ctx.locale.register(namespace, 'ja', dictionary)
        return typeof dispose === 'function' ? dispose : () => {}
      } catch (error) {
        const message = error instanceof Error ? error.message : 'register failed'
        console.error(`dsh-japanese: skipped Japanese dictionary ${namespace}: ${message}`)
        return () => {}
      }
    }, `dsh-japanese: ${namespace}`)
  }
}
