/* eslint-disable camelcase */
import type { NextApiRequest, NextApiResponse } from 'next'
import {
  buildClearAuthCookieStrings,
  clearAuthCookies,
  IDP_END_SESSION_URL_COOKIE
} from '../_cookies'
import { isMainProviderByName } from '../_federated'
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

  const { access_token, refresh_token, login_source } = req.cookies
  const revokeUrl = getRevokeUrl(issuer)

  // Revoke tokens
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

  // Get login_source from cookie (set during login)
  // This tells us if user logged in via federated IDP or main OIDC
  const detectedLoginSource = login_source

  const isMain = isMainProviderByName(detectedLoginSource)

  // CASE 1: Main OIDC logout or no login_source
  if (isMain || !detectedLoginSource) {
    console.info(`Main logout for "${detectedLoginSource || 'unknown'}".`)

    clearAuthCookies(res)

    // No id_token_hint needed - logout works without it
    const oidcParams = new URLSearchParams({
      client_id: clientId,
      post_logout_redirect_uri: callbackUrl,
      state: 'logout'
    })

    const mainLogoutUrl = `${getEndSessionUrl(issuer)}?${oidcParams.toString()}`
    return res.redirect(302, mainLogoutUrl)
  }

  // CASE 2: Federated/Partner logout
  // Step 1: Logout from partner IDP first
  const partnerEndSessionUrl = req.cookies[IDP_END_SESSION_URL_COOKIE]

  if (partnerEndSessionUrl) {
    // Set a cookie to track that we're in federated logout flow
    // This tells logout-continue to redirect back to main OIDC after partner logout
    res.setHeader('Set-Cookie', [
      ...buildClearAuthCookieStrings(),
      serializeFederatedLogoutContinueCookie('1', 300) // 5 min expiry
    ])

    const partnerLogoutUrl = new URL(partnerEndSessionUrl)
    partnerLogoutUrl.searchParams.set('post_logout_redirect_uri', callbackUrl)

    console.info(
      `Partner logout for "${detectedLoginSource}". Redirecting to: ${partnerLogoutUrl.toString()}`
    )

    // Step 2: Redirect to partner IDP for logout
    // After partner logout, user comes back to /auth/callback/logout
    // Then logout-continue handles the main OIDC logout
    return res.redirect(302, partnerLogoutUrl.toString())
  }

  // CASE 3: Fallback - if we can't find partner logout URL
  console.warn(
    `No partner logout endpoint found for "${detectedLoginSource}". Falling back to Main logout.`
  )

  clearAuthCookies(res)

  const oidcParams = new URLSearchParams({
    client_id: clientId,
    post_logout_redirect_uri: callbackUrl,
    state: 'logout'
  })

  const mainLogoutUrl = `${getEndSessionUrl(issuer)}?${oidcParams.toString()}`
  return res.redirect(302, mainLogoutUrl)
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
