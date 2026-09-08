/* eslint-disable camelcase */
import type { NextApiRequest, NextApiResponse } from 'next'
import { jwtVerify, type JWTPayload } from 'jose'
import { clearAuthCookies, DEFAULT_ACCESS_TOKEN_MAX_AGE } from './_cookies'
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

  if (!accessToken && !refreshToken) {
    clearAuthCookies(res)
    return res.status(401).json({
      error: 'No session',
      has_refresh_token: false
    })
  }

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

  try {
    let accessTokenExp: number | undefined
    let userClaims: JWTPayload | null = null

    if (accessToken) {
      try {
        const parts = accessToken.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
          userClaims = payload
        }
      } catch (e) {
        console.warn('Could not decode access_token, using introspection only')
      }

      const introspection = await introspectAccessToken(
        accessToken,
        issuer,
        clientId,
        clientSecret
      )
      if (introspection.status === 'inactive') {
        clearAuthCookies(res)
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
    const now = Math.floor(Date.now() / 1000)
    const expiresIn = accessTokenExp
      ? Math.max(0, accessTokenExp - now)
      : DEFAULT_ACCESS_TOKEN_MAX_AGE

    if (userClaims) {
      const authMeta = {
        main_oidc: getOptionalStringClaim(userClaims, 'iss') || issuer,
        upstream_idp: getLoginSource(userClaims) || 'unknown'
      }
      const organizationId = getOptionalStringClaim(userClaims, 'orgId')

      return res.status(200).json({
        user: {
          id: getOptionalStringClaim(userClaims, 'sub'),
          email: getOptionalStringClaim(userClaims, 'email'),
          name: getOptionalStringClaim(userClaims, 'name'),
          username:
            getOptionalStringClaim(userClaims, 'preferred_username') ||
            getOptionalStringClaim(userClaims, 'username'),
          organizationId
        },
        authMeta,
        has_refresh_token: Boolean(refreshToken),
        expires_in: expiresIn
      })
    } else {
      return res.status(200).json({
        user: {
          id: 'session-active',
          email: 'session@active',
          name: 'Active Session',
          organizationId: undefined
        },
        authMeta: {
          main_oidc: issuer,
          upstream_idp: 'unknown'
        },
        has_refresh_token: Boolean(refreshToken),
        expires_in: expiresIn
      })
    }
  } catch (error) {
    console.error('Session verification failed:', error)
    if (!refreshToken) clearAuthCookies(res)
    return res.status(401).json({
      error: 'Session verification failed',
      has_refresh_token: Boolean(refreshToken),
      refresh_required: Boolean(refreshToken)
    })
  }
}
