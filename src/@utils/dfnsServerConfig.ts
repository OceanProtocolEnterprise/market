import type { NextApiRequest } from 'next'

const DEFAULT_DFNS_API_URL = 'https://api.dfns.io'

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

function getRequestOrigin(req: NextApiRequest) {
  const protocol =
    (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0] ||
    'http'
  const host = req.headers['x-forwarded-host'] || req.headers.host

  if (!host) return undefined

  return `${protocol}://${host}`
}

type DfnsSsoConfigInput = {
  orgId?: string
}

export function getDfnsApiUrl() {
  return trimTrailingSlash(
    process.env.NEXT_PUBLIC_DFNS_API_URL || DEFAULT_DFNS_API_URL
  )
}

export function getDfnsSsoConfig(
  req: NextApiRequest,
  input: DfnsSsoConfigInput = {}
) {
  const orgId = input.orgId || process.env.NEXT_PUBLIC_DFNS_ORG_ID
  const clientId = process.env.NEXT_PUBLIC_OIDC_CLIENT_ID
  const origin = getRequestOrigin(req)
  const redirectUri = origin
    ? `${origin}/api/dfns/complete-sso`
    : process.env.NEXT_PUBLIC_OIDC_REDIRECT_URI

  const missing = [
    !orgId && 'NEXT_PUBLIC_DFNS_ORG_ID',
    !clientId && 'NEXT_PUBLIC_OIDC_CLIENT_ID',
    !redirectUri && 'request origin'
  ].filter(Boolean)

  if (missing.length) {
    throw new Error(`Missing Dfns SSO configuration: ${missing.join(', ')}`)
  }

  return {
    apiUrl: getDfnsApiUrl(),
    orgId: orgId as string,
    clientId: clientId as string,
    redirectUri: redirectUri as string
  }
}

export function serializeDfnsTokenCookie(token: string, maxAge: number) {
  const secure = process.env.NODE_ENV === 'production' ? 'Secure' : ''

  return [
    `dfns_token=${encodeURIComponent(token)}`,
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    secure
  ]
    .filter(Boolean)
    .join('; ')
}
