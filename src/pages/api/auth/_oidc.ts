import { createRemoteJWKSet } from 'jose'
import { OIDC_DISCOVERY_PATH, OIDC_REQUEST_TIMEOUT_MS } from './_constants'

const oidcMetadataCache = new Map<
  string,
  {
    issuer: string
    jwks: ReturnType<typeof createRemoteJWKSet>
  }
>()

const endSessionUrlCache = new Map<string, string>()

export async function getOidcMetadata(issuer: string) {
  const normalizedIssuer = issuer.replace(/\/$/, '')
  const cached = oidcMetadataCache.get(normalizedIssuer)
  if (cached) return cached

  const discoveryUrl = `${normalizedIssuer}${OIDC_DISCOVERY_PATH}`
  const response = await fetch(discoveryUrl, {
    signal: AbortSignal.timeout(OIDC_REQUEST_TIMEOUT_MS)
  })

  if (!response.ok) {
    throw new Error('Unable to load OIDC discovery document')
  }

  const discovery = await response.json()
  if (!discovery.jwks_uri) {
    throw new Error('OIDC discovery document missing jwks_uri')
  }

  const metadata = {
    issuer: typeof discovery.issuer === 'string' ? discovery.issuer : issuer,
    jwks: createRemoteJWKSet(new URL(discovery.jwks_uri))
  }
  oidcMetadataCache.set(normalizedIssuer, metadata)
  return metadata
}

export async function getEndSessionUrlFromWellKnown(
  wellKnownUrl: string
): Promise<string> {
  const cached = endSessionUrlCache.get(wellKnownUrl)
  if (cached) return cached

  try {
    const response = await fetch(wellKnownUrl, {
      signal: AbortSignal.timeout(OIDC_REQUEST_TIMEOUT_MS)
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch OIDC metadata from ${wellKnownUrl}`)
    }

    const metadata = await response.json()

    let endSessionUrl = metadata.end_session_endpoint

    if (!endSessionUrl) {
      const baseUrl = wellKnownUrl.replace(
        '/.well-known/openid-configuration',
        ''
      )
      endSessionUrl = `${baseUrl.replace(/\/$/, '')}/end-session/`
    }

    endSessionUrlCache.set(wellKnownUrl, endSessionUrl)

    return endSessionUrl
  } catch (error) {
    console.error('Failed to fetch end_session_url from well-known:', error)
    throw error
  }
}

export function clearEndSessionUrlCache() {
  endSessionUrlCache.clear()
}
