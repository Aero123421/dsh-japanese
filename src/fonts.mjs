/** Same-origin path the Japanese stylesheet requests. The host serves the files. */
export const FONT_ROUTE = '/dsh-japanese/fonts'

const FONT_NAME = /^noto-sans-jp-[0-9]+-wght-normal\.woff2$/

/** The woff2 file name for a font URL, or undefined when the path is not one we ship.
 * @param pathname - decoded URL pathname.
 */
export function fontFileName(pathname) {
  const prefix = `${FONT_ROUTE}/`
  if (!pathname.startsWith(prefix)) return undefined
  const name = pathname.slice(prefix.length)
  return FONT_NAME.test(name) ? name : undefined
}
