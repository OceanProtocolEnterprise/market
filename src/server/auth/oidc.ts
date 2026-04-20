import crypto from 'crypto'
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'
import { getAppBaseUrl, getServerAuthConfig } from './config'

export type AuthMode = 'login' | 'signup'

interface OidcDiscovery {
  authorization_endpoint: string
  token_endpoint: string
  end_session_endpoint?: string
  jwks_uri: string
}

function encodeBase64Url(input: Buffer): string {
  return input
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function deriveLegacyEndpoints(issuer: string) {
  const match = issuer.match(/(.*\/application\/o\/)[^/]+\/?$/)
  const baseUrl = match
    ? match[1].replace(/\/$/, '')
    : issuer.replace(/\/[^/]+?\/?$/, '')

  return {
    authorize: `${baseUrl}/authorize/`,
    token: `${baseUrl}/token/`,
    endSession: `${issuer.replace(/\/$/, '')}/end-session/`
  }
}

function getDiscoveryUrl(issuer: string): URL {
  const normalizedIssuer = issuer.endsWith('/') ? issuer : `${issuer}/`
  return new URL('.well-known/openid-configuration', normalizedIssuer)
}

export async function getOidcDiscovery(): Promise<OidcDiscovery> {
  const config = getServerAuthConfig()
  const response = await fetch(getDiscoveryUrl(config.issuer))

  if (!response.ok) {
    throw new Error(`OIDC discovery failed with status ${response.status}`)
  }

  return (await response.json()) as OidcDiscovery
}

export function generateRandomString(size = 32): string {
  return encodeBase64Url(crypto.randomBytes(size))
}

export function generatePkcePair() {
  const verifier = generateRandomString(32)
  const challenge = encodeBase64Url(
    crypto.createHash('sha256').update(verifier).digest()
  )

  return { verifier, challenge }
}

export async function buildAuthorizeUrl(
  mode: AuthMode,
  state: string,
  nonce: string,
  codeChallenge: string
): Promise<string> {
  const config = getServerAuthConfig()
  const discovery = await getOidcDiscovery()
  const authorizeUrl = new URL(discovery.authorization_endpoint)

  authorizeUrl.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: config.responseType,
    scope: config.scope,
    code_challenge: codeChallenge,
    code_challenge_method: config.pkceMethod,
    state,
    nonce
  }).toString()

  if (mode === 'signup') {
    const authentikBase = config.issuer.replace(/\/application\/o\/.*$/, '')
    const signupUrl = new URL(
      '/if/flow/self-service-registration/',
      authentikBase
    )

    signupUrl.search = new URLSearchParams({
      next: authorizeUrl.toString()
    }).toString()

    return signupUrl.toString()
  }

  return authorizeUrl.toString()
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
) {
  const config = getServerAuthConfig()
  const discovery = await getOidcDiscovery()
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    code,
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier
  })

  if (config.clientSecret) {
    body.set('client_secret', config.clientSecret)
  }

  const response = await fetch(discovery.token_endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  })

  if (!response.ok) {
    throw new Error(`OIDC token exchange failed with status ${response.status}`)
  }

  return (await response.json()) as {
    access_token?: string
    id_token?: string
    refresh_token?: string
    expires_in?: number
  }
}

export async function verifyIdToken(
  idToken: string,
  nonce: string
): Promise<JWTPayload> {
  const config = getServerAuthConfig()
  const discovery = await getOidcDiscovery()
  const jwks = createRemoteJWKSet(new URL(discovery.jwks_uri))
  const verified = await jwtVerify(idToken, jwks, {
    issuer: config.issuer,
    audience: config.clientId
  })

  if (verified.payload.nonce !== nonce) {
    throw new Error('OIDC nonce validation failed')
  }

  return verified.payload
}

export async function buildLogoutUrl(
  idTokenHint?: string,
  appBaseUrl?: string
): Promise<string | null> {
  const config = getServerAuthConfig()

  if (!config.issuer || !config.clientId) {
    return null
  }

  let endSessionEndpoint: string | undefined

  try {
    const discovery = await getOidcDiscovery()
    endSessionEndpoint = discovery.end_session_endpoint
  } catch {
    endSessionEndpoint = deriveLegacyEndpoints(config.issuer).endSession
  }

  if (!endSessionEndpoint) {
    return null
  }

  const logoutUrl = new URL(endSessionEndpoint)
  const baseUrl = appBaseUrl || getAppBaseUrl()

  logoutUrl.search = new URLSearchParams({
    client_id: config.clientId,
    post_logout_redirect_uri: `${baseUrl}/auth/login`,
    ...(idTokenHint ? { id_token_hint: idTokenHint } : {})
  }).toString()

  return logoutUrl.toString()
}
