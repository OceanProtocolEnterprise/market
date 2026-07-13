/* eslint-disable camelcase */
import type { NextApiRequest, NextApiResponse } from 'next'
import { decodeJwt } from 'jose'
import { buildClearAuthCookieStrings, clearAuthCookies } from '../_cookies'
import { getFederatedProvider } from '../_federated'
import { getLoginSource } from '../_claims'
import { authEnabled, oidcClientId, oidcIssuer } from 'app.config.cjs'

const OIDC_CLIENT_SECRET_ENV_KEY = 'OIDC_CLIENT_SECRET'
const FEDERATED_LOGOUT_CONTINUE_COOKIE = 'federated_logout_continue'

function getHeaderValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || '' : value || ''
}

function getRequestOrigin(req: NextApiRequest): string {
  const host = getHeaderValue(req.headers.host)
  const forwardedProto = getHeaderValue(req.headers['x-forwarded-proto'])
  const protocol = forwardedProto.split(',')[0]?.trim() || 'https'

  return `${protocol}://${host}`
}

function getEndSessionUrl(issuer: string): string {
  return `${issuer.replace(/\/$/, '')}/end-session/`
}

function getRevokeUrl(issuer: string): string {
  if (issuer.includes('/application/o/')) {
    const base = issuer.split('/application/o/')[0]
    return `${base}/application/o/revoke/`
  }

  return `${issuer.replace(/\/$/, '')}/revoke/`
}

function getLoginSourceFromIdToken(idToken?: string): string | undefined {
  if (!idToken) return undefined

  try {
    return getLoginSource(decodeJwt(idToken))
  } catch {
    return undefined
  }
}

function serializeFederatedLogoutContinueCookie(
  value: string,
  maxAge: number
): string {
  return `${FEDERATED_LOGOUT_CONTINUE_COOKIE}=${encodeURIComponent(
    value
  )}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax; Path=/api/auth/logout`
}

async function revokeToken(
  revokeUrl: string,
  clientId: string,
  clientSecret: string,
  token: string,
  tokenTypeHint: string
): Promise<void> {
  try {
    await fetch(revokeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        token,
        token_type_hint: tokenTypeHint
      }),
      signal: AbortSignal.timeout(5000)
    })
  } catch (err) {
    console.error(`Failed to revoke ${tokenTypeHint}:`, err)
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const clientId = oidcClientId
  const clientSecret = process.env[OIDC_CLIENT_SECRET_ENV_KEY]
  const issuer = oidcIssuer

  if (!clientId || !clientSecret || !issuer) {
    console.error('Missing OIDC configuration.')
    clearAuthCookies(res)
    return res.redirect(302, '/auth/login')
  }

  const { access_token, refresh_token, id_token, login_source } = req.cookies
  const revokeUrl = getRevokeUrl(issuer)

  await Promise.all([
    access_token
      ? revokeToken(
          revokeUrl,
          clientId,
          clientSecret,
          access_token,
          'access_token'
        )
      : Promise.resolve(),
    refresh_token
      ? revokeToken(
          revokeUrl,
          clientId,
          clientSecret,
          refresh_token,
          'refresh_token'
        )
      : Promise.resolve()
  ])

  const callbackUrl = `${getRequestOrigin(req)}/auth/callback/logout`

  const oidcParams = new URLSearchParams({
    client_id: clientId,
    post_logout_redirect_uri: callbackUrl,
    state: 'logout'
  })

  if (id_token) {
    oidcParams.set('id_token_hint', id_token)
  }

  const mainLogoutUrl = `${getEndSessionUrl(issuer)}?${oidcParams.toString()}`

  const detectedLoginSource =
    login_source || getLoginSourceFromIdToken(id_token)

  const provider = getFederatedProvider(detectedLoginSource)

  if (!provider) {
    console.warn(
      `Unknown login source "${detectedLoginSource}", using Main OIDC logout.`
    )

    clearAuthCookies(res)

    return res.redirect(302, mainLogoutUrl)
  }

  if (provider.type === 'main') {
    console.info(`Main logout for "${detectedLoginSource}".`)

    clearAuthCookies(res)

    return res.redirect(302, mainLogoutUrl)
  }

  if (!provider.logout) {
    console.warn(
      `Partner "${detectedLoginSource}" has no logout endpoint. Falling back to Main logout.`
    )

    clearAuthCookies(res)

    return res.redirect(302, mainLogoutUrl)
  }

  res.setHeader('Set-Cookie', [
    ...buildClearAuthCookieStrings({
      keepIdToken: true
    }),
    serializeFederatedLogoutContinueCookie('1', 300)
  ])

  const partnerLogoutUrl = new URL(provider.logout)
  partnerLogoutUrl.searchParams.set('post_logout_redirect_uri', callbackUrl)

  if (id_token) {
    partnerLogoutUrl.searchParams.set('id_token_hint', id_token)
  }
  console.info(`Partner logout for "${detectedLoginSource}".`)

  return res.redirect(302, partnerLogoutUrl.toString())
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (authEnabled !== 'true') {
    return res.status(404).json({
      error: 'Not found'
    })
  }

  if (req.method === 'GET') {
    return handleGet(req, res)
  }

  res.setHeader('Allow', ['GET'])
  return res.status(405).json({
    error: 'Method not allowed'
  })
}
