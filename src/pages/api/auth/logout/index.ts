/* eslint-disable camelcase */
import type { NextApiRequest, NextApiResponse } from 'next'
import { decodeJwt } from 'jose'
import {
  buildClearAuthCookieStrings,
  clearAuthCookies,
  IDP_END_SESSION_URL_COOKIE
} from '../_cookies'
import { getFederatedProvider, isMainProviderByName } from '../_federated'
import { getLoginSource, getWellKnownUrl } from '../_claims'
import { getEndSessionUrlFromWellKnown } from '../_oidc'
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

  const detectedLoginSource =
    login_source || getLoginSourceFromIdToken(id_token)

  const isMain = isMainProviderByName(detectedLoginSource)

  if (isMain || !detectedLoginSource) {
    console.info(`Main logout for "${detectedLoginSource || 'unknown'}".`)

    clearAuthCookies(res)

    // Only send id_token_hint if it's from the main issuer
    const oidcParams = new URLSearchParams({
      client_id: clientId,
      post_logout_redirect_uri: callbackUrl,
      state: 'logout'
    })

    if (id_token) {
      try {
        const decoded = decodeJwt(id_token)
        if (decoded.iss === issuer) {
          oidcParams.set('id_token_hint', id_token)
        }
      } catch (error) {
        console.warn('Could not decode id_token for main logout:', error)
      }
    }

    const mainLogoutUrl = `${getEndSessionUrl(issuer)}?${oidcParams.toString()}`
    return res.redirect(302, mainLogoutUrl)
  }

  const partnerEndSessionUrl = req.cookies[IDP_END_SESSION_URL_COOKIE]

  if (partnerEndSessionUrl) {
    res.setHeader('Set-Cookie', [
      ...buildClearAuthCookieStrings({
        keepIdToken: true
      }),
      serializeFederatedLogoutContinueCookie('1', 300)
    ])

    const partnerLogoutUrl = new URL(partnerEndSessionUrl)
    partnerLogoutUrl.searchParams.set('post_logout_redirect_uri', callbackUrl)

    console.info(
      `Partner logout for "${detectedLoginSource}". Redirecting to: ${partnerLogoutUrl.toString()}`
    )

    return res.redirect(302, partnerLogoutUrl.toString())
  }

  if (id_token) {
    try {
      const decoded = decodeJwt(id_token)
      const wellKnownUrl = getWellKnownUrl(decoded)

      if (wellKnownUrl) {
        try {
          const endSessionUrl = await getEndSessionUrlFromWellKnown(
            wellKnownUrl
          )

          if (endSessionUrl) {
            res.setHeader('Set-Cookie', [
              ...buildClearAuthCookieStrings({
                keepIdToken: true
              }),
              serializeFederatedLogoutContinueCookie('1', 300)
            ])

            const partnerLogoutUrl = new URL(endSessionUrl)
            partnerLogoutUrl.searchParams.set(
              'post_logout_redirect_uri',
              callbackUrl
            )

            console.info(
              `Partner logout for "${detectedLoginSource}" (from well-known). Redirecting to: ${partnerLogoutUrl.toString()}`
            )

            return res.redirect(302, partnerLogoutUrl.toString())
          }
        } catch (error) {
          console.warn(
            `Failed to get end_session_url from well-known for ${detectedLoginSource}:`,
            error
          )
        }
      }
    } catch (error) {
      console.warn('Could not decode id_token for partner logout:', error)
    }
  }

  console.warn(
    `No partner logout endpoint found for "${detectedLoginSource}". Falling back to Main logout.`
  )

  clearAuthCookies(res)

  const oidcParams = new URLSearchParams({
    client_id: clientId,
    post_logout_redirect_uri: callbackUrl,
    state: 'logout'
  })

  if (id_token) {
    try {
      const decoded = decodeJwt(id_token)
      if (decoded.iss === issuer) {
        oidcParams.set('id_token_hint', id_token)
      }
    } catch (error) {
      console.warn('Could not decode id_token for fallback logout:', error)
    }
  }

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
