import type { NextApiRequest, NextApiResponse } from 'next'
import { buildLogoutUrl } from '@server/auth/oidc'
import { getAppBaseUrl } from '@server/auth/config'
import {
  AUTH_CALLBACK_COOKIE,
  AUTH_NONCE_COOKIE,
  AUTH_PKCE_COOKIE,
  AUTH_STATE_COOKIE,
  clearSessionCookie,
  clearTransientCookie,
  readSession
} from '@server/auth/session'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await readSession(req)
  const logoutUrl = await buildLogoutUrl(
    session?.idTokenHint,
    getAppBaseUrl(req)
  )

  res.setHeader('Set-Cookie', [
    clearSessionCookie(),
    clearTransientCookie(AUTH_STATE_COOKIE),
    clearTransientCookie(AUTH_NONCE_COOKIE),
    clearTransientCookie(AUTH_PKCE_COOKIE),
    clearTransientCookie(AUTH_CALLBACK_COOKIE)
  ])

  if (logoutUrl) {
    res.redirect(302, logoutUrl)
    return
  }

  res.redirect(302, '/auth/login')
}
