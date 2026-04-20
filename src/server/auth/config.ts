import type { IncomingMessage } from 'http'

function readHeader(
  req: IncomingMessage | undefined,
  headerName: string
): string | undefined {
  const value = req?.headers?.[headerName]

  if (Array.isArray(value)) return value[0]

  return value
}

export function getAppBaseUrl(req?: IncomingMessage): string {
  const forwardedProto = readHeader(req, 'x-forwarded-proto')
  const forwardedHost = readHeader(req, 'x-forwarded-host')
  const host = forwardedHost || readHeader(req, 'host')

  if (host) {
    return `${forwardedProto || 'https'}://${host}`
  }

  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:8008'
  )
}

export function getServerAuthConfig(req?: IncomingMessage) {
  const issuer =
    process.env.OIDC_ISSUER || process.env.NEXT_PUBLIC_OIDC_ISSUER || ''
  const clientId =
    process.env.OIDC_CLIENT_ID || process.env.NEXT_PUBLIC_OIDC_CLIENT_ID || ''
  const clientSecret =
    process.env.OIDC_CLIENT_SECRET ||
    process.env.NEXT_PUBLIC_OIDC_CLIENT_SECRET ||
    ''
  const redirectUri =
    process.env.OIDC_REDIRECT_URI ||
    process.env.NEXT_PUBLIC_OIDC_REDIRECT_URI ||
    `${getAppBaseUrl(req)}/api/auth/callback`
  const sessionSecret =
    process.env.AUTH_SESSION_SECRET ||
    process.env.OIDC_CLIENT_SECRET ||
    process.env.NEXT_PUBLIC_OIDC_CLIENT_SECRET ||
    ''

  return {
    enabled: process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true',
    issuer,
    clientId,
    clientSecret,
    redirectUri,
    scope: 'openid profile email federated_identity',
    responseType: 'code',
    pkceMethod: 'S256',
    sessionSecret
  }
}
