import { fontFileNames } from './font-files.mjs'

/** Same-origin path the Japanese stylesheet requests. The host serves the files. */
export const FONT_ROUTE = '/dsh-japanese/fonts'

const shipped = new Set(fontFileNames)

/** The woff2 file name for a font URL, or undefined when the path is not one we ship.
 * The allowlist is the files the build copied into dist/fonts, including latin subsets.
 * @param pathname - decoded URL pathname.
 */
export function fontFileName(pathname) {
  const prefix = `${FONT_ROUTE}/`
  if (!pathname.startsWith(prefix)) return undefined
  const name = pathname.slice(prefix.length)
  return shipped.has(name) ? name : undefined
}
