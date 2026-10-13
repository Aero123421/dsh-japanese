import { REPOSITORY } from './updates.ts'
function allowedUrl(value: string | URL) {
  const url = new URL(String(value))
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) throw new Error('redirect')
  if (url.hostname === 'api.github.com' && url.pathname.startsWith(`/repos/${REPOSITORY}/`)) return url
  if (url.hostname === 'github.com' && url.pathname.startsWith(`/${REPOSITORY}/releases/download/`)) return url
  if (url.hostname === 'raw.githubusercontent.com' && url.pathname.startsWith(`/${REPOSITORY}/`)) return url
  if (['release-assets.githubusercontent.com', 'objects.githubusercontent.com'].includes(url.hostname)) return url
  throw new Error('redirect')
}
export async function boundedFetch(url: string, limit: number, { fetcher = fetch, signal }: { fetcher?: typeof fetch; signal?: AbortSignal } = {}) {
  const timeout = AbortSignal.timeout(20000)
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout
  for (let redirects = 0; redirects <= 4; redirects++) {
    const response = await fetcher(allowedUrl(url), { redirect: 'manual', signal: combined, headers: { accept: 'application/vnd.github+json' } })
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const next = response.headers.get('location'); await response.body?.cancel()
      if (!next) throw new Error('redirect')
      url = new URL(next, url).href; continue
    }
    if (!response.ok) { await response.body?.cancel(); throw new Error(response.status === 404 ? 'release-unavailable' : 'network') }
    if (Number(response.headers.get('content-length')) > limit) { await response.body?.cancel(); throw new Error('size') }
    const chunks: Buffer[] = []; let bytes = 0
    const reader = response.body?.getReader()
    if (!reader) throw new Error('network')
    try {
      for (;;) {
        combined.throwIfAborted()
        const { done, value } = await reader.read()
        if (done) return Buffer.concat(chunks, bytes)
        bytes += value.byteLength
        if (bytes > limit) throw new Error('size')
        chunks.push(Buffer.from(value))
      }
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
  }
  throw new Error('redirect')
}

