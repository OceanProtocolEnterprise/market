import type { NextApiRequest, NextApiResponse } from 'next'
import { exchangeCodeForTokens, verifyIdToken } from '@server/auth/oidc'
import {
  AUTH_CALLBACK_COOKIE,
  AUTH_NONCE_COOKIE,
  AUTH_PKCE_COOKIE,
  AUTH_STATE_COOKIE,
  clearTransientCookie,
  createSessionCookie,
  createSessionToken,
  getSafeCallbackUrl
} from '@server/auth/session'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const code = typeof req.query.code === 'string' ? req.query.code : null
  const state = typeof req.query.state === 'string' ? req.query.state : null
  const error = typeof req.query.error === 'string' ? req.query.error : null
  const storedState = req.cookies[AUTH_STATE_COOKIE]
  const nonce = req.cookies[AUTH_NONCE_COOKIE]
  const codeVerifier = req.cookies[AUTH_PKCE_COOKIE]
  const callbackUrl =
    getSafeCallbackUrl(req.cookies[AUTH_CALLBACK_COOKIE]) || '/profile'

  const clearCookies = [
    clearTransientCookie(AUTH_STATE_COOKIE),
    clearTransientCookie(AUTH_NONCE_COOKIE),
    clearTransientCookie(AUTH_PKCE_COOKIE),
    clearTransientCookie(AUTH_CALLBACK_COOKIE)
  ]

  if (error || !code || !state || !storedState || state !== storedState) {
    res.setHeader('Set-Cookie', clearCookies)
    res.redirect(302, '/auth/login?error=auth_failed')
    return
  }

  if (!nonce || !codeVerifier) {
    res.setHeader('Set-Cookie', clearCookies)
    res.redirect(302, '/auth/login?error=auth_failed')
    return
  }

  try {
    const tokens = await exchangeCodeForTokens(code, codeVerifier)

    if (!tokens.id_token) {
      throw new Error('Missing id_token in token response')
    }

    const payload = await verifyIdToken(tokens.id_token, nonce)
    const expiresAt =
      typeof payload.exp === 'number'
        ? payload.exp
        : Math.floor(Date.now() / 1000) + 60 * 60 * 12
    const sessionToken = await createSessionToken({
      sub: payload.sub as string,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      name: typeof payload.name === 'string' ? payload.name : undefined,
      username:
        typeof payload.preferred_username === 'string'
          ? payload.preferred_username
          : typeof payload.username === 'string'
          ? payload.username
          : undefined,
      idTokenHint: tokens.id_token,
      exp: expiresAt
    })

    res.setHeader('Set-Cookie', [
      ...clearCookies,
      createSessionCookie(sessionToken, expiresAt)
    ])
    res.redirect(
      302,
      `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    )
  } catch (callbackError) {
    console.error('OIDC callback failed:', callbackError)
    res.setHeader('Set-Cookie', clearCookies)
    res.redirect(302, '/auth/login?error=auth_failed')
  }
}
