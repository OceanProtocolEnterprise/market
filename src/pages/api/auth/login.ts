/* eslint-disable camelcase */
import type { NextApiRequest, NextApiResponse } from 'next'
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateRandomString,
  isSafeCallbackUrl,
  setTransientCookies
} from './_transient'
import {
  authEnabled,
  oidcClientId,
  oidcIssuer,
  oidcRedirectUri
} from 'app.config.cjs'

function getAuthorizeUrl(issuer: string): string {
  if (issuer.includes('/application/o/')) {
    const base = issuer.split('/application/o/')[0]
    return `${base}/application/o/authorize/`
  }
  return `${issuer.replace(/\/$/, '')}/authorize/`
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end()
  }

  if (authEnabled !== 'true') {
    return res.status(404).end()
  }

  const issuer = oidcIssuer
  const clientId = oidcClientId
  const redirectUri = oidcRedirectUri

  if (!issuer || !clientId || !redirectUri) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const rawCallbackUrl =
    typeof req.query.callbackUrl === 'string' ? req.query.callbackUrl : ''
  const callbackUrl = isSafeCallbackUrl(rawCallbackUrl) ? rawCallbackUrl : null

  const codeVerifier = generateCodeVerifier()
  const codeChallenge = generateCodeChallenge(codeVerifier)
  const state = generateRandomString()
  const nonce = generateRandomString()

  setTransientCookies(res, {
    oidc_pkce_verifier: codeVerifier,
    oidc_state: state,
    oidc_nonce: nonce,
    ...(callbackUrl ? { oidc_callback_url: callbackUrl } : {})
  })

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope:
      'openid profile email offline_access federated_identity organizationId',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce
  })

  return res.redirect(302, `${getAuthorizeUrl(issuer)}?${params.toString()}`)
}
