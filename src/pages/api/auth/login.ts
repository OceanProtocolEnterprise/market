import type { NextApiRequest, NextApiResponse } from 'next'
import {
  buildAuthorizeUrl,
  generatePkcePair,
  generateRandomString
} from '@server/auth/oidc'
import { getServerAuthConfig } from '@server/auth/config'
import {
  AUTH_CALLBACK_COOKIE,
  AUTH_NONCE_COOKIE,
  AUTH_PKCE_COOKIE,
  AUTH_STATE_COOKIE,
  createTransientCookie,
  getSafeCallbackUrl
} from '@server/auth/session'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const config = getServerAuthConfig(req)

  if (!config.enabled) {
    res.redirect(302, '/')
    return
  }

  const mode = req.query.mode === 'signup' ? 'signup' : 'login'
  const callbackUrl = getSafeCallbackUrl(req.query.callbackUrl) || '/profile'
  const state = generateRandomString()
  const nonce = generateRandomString()
  const { verifier, challenge } = generatePkcePair()
  const authorizeUrl = await buildAuthorizeUrl(mode, state, nonce, challenge)

  res.setHeader('Set-Cookie', [
    createTransientCookie(AUTH_STATE_COOKIE, state),
    createTransientCookie(AUTH_NONCE_COOKIE, nonce),
    createTransientCookie(AUTH_PKCE_COOKIE, verifier),
    createTransientCookie(AUTH_CALLBACK_COOKIE, callbackUrl)
  ])
  res.redirect(302, authorizeUrl)
}
