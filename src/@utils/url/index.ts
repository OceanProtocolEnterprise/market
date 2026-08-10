import isUrl from 'is-url-superb'

export function sanitizeUrl(url: string) {
  try {
    const u = decodeURI(url).trim().toLowerCase()
    const isAllowedUrlScheme =
      u.startsWith('http://') || u.startsWith('https://')
    return isAllowedUrlScheme ? url : 'about:blank'
  } catch {
    return 'about:blank'
  }
}

// Prepend `https://` when a URL has no explicit http(s) scheme, so that
// scheme-less values (e.g. `oceanenterprise.io`) resolve as web links.
// Anything carrying a different scheme (e.g. `javascript:`) also gets the
// prefix, which neutralises it into a harmless, non-executable link.
export function ensureUrlScheme(url: string): string {
  const trimmed = url?.trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

// Validates an optional web URL. Empty passes (the fields using this are
// optional). Scheme-less hosts like `oceanenterprise.io` are accepted because
// the scheme is inferred the same way the asset page renders the link. Builds
// on the `new URL()` + http(s) protocol check used for credential URLs.
export function isValidWebUrl(url: string): boolean {
  const trimmed = url?.trim()
  if (!trimmed) return true
  // The host as typed must contain a dot: a real domain (`domain.tld`) or IP
  // (`a.b.c.d`) always does. Without this, the URL parser silently coerces a
  // bare integer (e.g. `2312321` -> `0.35.71.65`) into an IP and accepts it,
  // and bare single-word tokens (`localhost`, `rweASDsSDADS`) would slip in.
  const typedHost = trimmed.replace(/^https?:\/\//i, '').split(/[/?#]/)[0]
  if (!typedHost.includes('.')) return false
  try {
    const parsed = new URL(ensureUrlScheme(trimmed))
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false
    }
    // hostname must resolve to a domain/IP: at least two non-empty,
    // dot-separated labels. This also rejects ".io" and "example.".
    const labels = parsed.hostname.split('.')
    return labels.length >= 2 && labels.every((label) => label.length > 0)
  } catch {
    return false
  }
}

export function safeExternalWebUrl(url: string): string {
  const normalizedUrl = ensureUrlScheme(url)
  return isValidWebUrl(normalizedUrl)
    ? sanitizeUrl(normalizedUrl)
    : 'about:blank'
}

// check if the url is a google domain
export const isGoogleUrl = (url: string): boolean => {
  if (!url || !isUrl(url)) return

  const urlString = new URL(url)
  const googleUrl = urlString.hostname.endsWith('google.com')
  const isGoogleStorage = urlString.hostname.endsWith(
    'storage.cloud.google.com'
  )
  return isGoogleStorage ? false : googleUrl
}
