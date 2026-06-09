/* eslint-disable camelcase */
import type { NextApiRequest, NextApiResponse } from 'next'
import { jwtVerify, type JWTPayload } from 'jose'
import { DEFAULT_ACCESS_TOKEN_MAX_AGE } from './_cookies'
import { getOidcMetadata } from './_oidc'
import { introspectAccessToken } from './_introspect'
import { getLoginSource, getOptionalStringClaim } from './_claims'
import { authEnabled, oidcClientId, oidcIssuer } from 'app.config.cjs'

const OIDC_CLIENT_SECRET_ENV_KEY = 'OIDC_CLIENT_SECRET'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Cache-Control', 'no-store')

  if (authEnabled !== 'true') {
    return res.status(404).json({ error: 'Not found' })
  }

  const accessToken = req.cookies.access_token
  const refreshToken = req.cookies.refresh_token
  const idToken = req.cookies.id_token

  if (!accessToken && !refreshToken) {
    return res.status(401).json({
      error: 'No session',
      has_refresh_token: false
    })
  }

  // A refresh token alone is not enough to trust the session. Make the client
  // refresh so Authentik can reject revoked sessions with `invalid_grant`.
  if (!accessToken && refreshToken) {
    return res.status(401).json({
      error: 'Access token missing',
      has_refresh_token: true,
      refresh_required: true
    })
  }

  const issuer = oidcIssuer
  const clientId = oidcClientId
  const clientSecret = process.env[OIDC_CLIENT_SECRET_ENV_KEY]

  if (!issuer || !clientId || !clientSecret) {
    console.error('Missing OIDC configuration for session verification')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  if (!idToken) {
    return res.status(401).json({
      error: 'Session verification required',
      has_refresh_token: Boolean(refreshToken),
      refresh_required: Boolean(refreshToken)
    })
  }

  try {
    const metadata = await getOidcMetadata(issuer)
    // Tolerate an expired id_token: access-token introspection below is the
    // live source of truth for session validity. Signature/issuer/audience
    // failures still bubble to the outer catch and 401 the session.
    const { payload } = await jwtVerify(idToken, metadata.jwks, {
      issuer: metadata.issuer,
      audience: clientId
    }).catch((error) => {
      const { code, payload: expiredPayload } = error as {
        code?: string
        payload?: JWTPayload
      }
      if (code !== 'ERR_JWT_EXPIRED' || !expiredPayload) throw error

      console.warn(
        'Session id_token expired; falling back to introspection. ' +
          'If frequent, check that the IdP returns id_token on the refresh_token grant.'
      )
      return { payload: expiredPayload }
    })

    // JWT verification only proves the token was issued by us. Introspection
    // is the live source of truth for revocations after token issuance.
    let accessTokenExp: number | undefined
    if (accessToken) {
      const introspection = await introspectAccessToken(
        accessToken,
        issuer,
        clientId,
        clientSecret
      )
      if (introspection.status === 'inactive') {
        return res.status(401).json({
          error: 'Session terminated',
          has_refresh_token: Boolean(refreshToken)
        })
      }

      if (introspection.status === 'unknown') {
        return res.status(503).json({
          error: 'Session status unavailable',
          has_refresh_token: Boolean(refreshToken)
        })
      }

      accessTokenExp = introspection.exp
    }

    // Session lifetime tracks the access token (what the SPA actually needs to
    // call protected APIs), not the id_token. The id_token is only an
    // authentication assertion at login time.
    const now = Math.floor(Date.now() / 1000)
    const expiresIn = accessTokenExp
      ? Math.max(0, accessTokenExp - now)
      : payload.exp
      ? Math.max(0, payload.exp - now)
      : DEFAULT_ACCESS_TOKEN_MAX_AGE

    const authMeta = {
      main_oidc: getOptionalStringClaim(payload, 'iss') || issuer,
      upstream_idp: getLoginSource(payload) || 'unknown'
    }
    const organizationId = getOptionalStringClaim(payload, 'organizationId')

    return res.status(200).json({
      user: {
        id: getOptionalStringClaim(payload, 'sub'),
        email: getOptionalStringClaim(payload, 'email'),
        name: getOptionalStringClaim(payload, 'name'),
        username:
          getOptionalStringClaim(payload, 'preferred_username') ||
          getOptionalStringClaim(payload, 'username'),
        organizationId
      },
      authMeta,
      has_refresh_token: Boolean(refreshToken),
      expires_in: expiresIn
    })
  } catch (error) {
    console.error('Session id_token verification failed:', error)
    return res.status(401).json({
      error: 'Session verification failed',
      has_refresh_token: Boolean(refreshToken),
      refresh_required: Boolean(refreshToken)
    })
  }
}
