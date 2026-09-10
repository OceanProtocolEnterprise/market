/* eslint-disable camelcase */
import type { NextApiRequest, NextApiResponse } from 'next'
import { buildClearAuthCookieStrings } from '../_cookies'
import { authEnabled, oidcClientId, oidcIssuer } from 'app.config.cjs'

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

function getEndSessionUrl(issuer: string) {
  return `${issuer.replace(/\/$/, '')}/end-session/`
}

function serializeFederatedLogoutContinueCookie(value: string, maxAge: number) {
  return `${FEDERATED_LOGOUT_CONTINUE_COOKIE}=${encodeURIComponent(
    value
  )}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax; Path=/api/auth/logout`
}

function clearLogoutCookies(res: NextApiResponse) {
  try {
    res.setHeader('Set-Cookie', [
      ...buildClearAuthCookieStrings(),
      serializeFederatedLogoutContinueCookie('', 0)
    ])
  } catch (error) {
    console.error('Failed to clear logout cookies:', error)
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end()
  }

  if (authEnabled !== 'true') {
    return res.status(404).end()
  }

  if (req.cookies[FEDERATED_LOGOUT_CONTINUE_COOKIE] !== '1') {
    console.info(
      'No federated logout continuation cookie found. Redirecting to login.'
    )
    clearLogoutCookies(res)
    return res.redirect(302, '/auth/login?loggedout=1')
  }

  const clientId = oidcClientId
  const issuer = oidcIssuer

  if (!clientId || !issuer) {
    console.error(
      'Missing Main OIDC configuration during federated logout continuation.'
    )
    clearLogoutCookies(res)
    return res.redirect(302, '/auth/login?loggedout=1')
  }

  try {
    const callbackUrl = `${getRequestOrigin(req)}/auth/callback/logout`

    const oidcParams = new URLSearchParams({
      client_id: clientId,
      post_logout_redirect_uri: callbackUrl,
      state: 'logout'
    })

    console.info('Continuing logout with Main OIDC provider.')
    console.info(
      `Redirecting to: ${getEndSessionUrl(issuer)}?${oidcParams.toString()}`
    )

    clearLogoutCookies(res)
    return res.redirect(
      302,
      `${getEndSessionUrl(issuer)}?${oidcParams.toString()}`
    )
  } catch (error) {
    console.error('Federated logout continuation failed:', error)
    clearLogoutCookies(res)
    return res.redirect(302, '/auth/login?loggedout=1')
  }
}
