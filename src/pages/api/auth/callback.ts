/* eslint-disable camelcase */
import type { NextApiRequest, NextApiResponse } from 'next'
import { jwtVerify, type JWTPayload } from 'jose'
import { buildAuthCookieStrings } from './_cookies'
import { buildClearTransientCookieStrings } from './_transient'
import { getOidcMetadata } from './_oidc'
import { OIDC_REQUEST_TIMEOUT_MS } from './_constants'
import { introspectAccessToken } from './_introspect'
import { getLoginSource } from './_claims'
import {
  authEnabled,
  oidcClientId,
  oidcIssuer,
  oidcRedirectUri,
  oidcTokenUrl
} from 'app.config.cjs'

const OIDC_CLIENT_SECRET_ENV_KEY = 'OIDC_CLIENT_SECRET'

function getTokenUrl(issuer: string): string {
  if (issuer.includes('/application/o/')) {
    const base = issuer.split('/application/o/')[0]
    return `${base}/application/o/token/`
  }
  return `${issuer.replace(/\/$/, '')}/token/`
}

function getRequiredStringClaim(payload: JWTPayload, claim: string): string {
  const value = payload[claim]
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`id_token missing required claim: ${claim}`)
  }
  return value
}

function buildLoginRedirect(params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString()
  return `/auth/login${qs ? `?${qs}` : ''}`
}

function failRedirect(res: NextApiResponse, reason = 'auth_failed') {
  res.setHeader('Set-Cookie', buildClearTransientCookieStrings())
  return res.redirect(302, buildLoginRedirect({ error: reason }))
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

  const { code, state, error } = req.query

  if (error) return failRedirect(res)

  if (typeof code !== 'string' || typeof state !== 'string') {
    return failRedirect(res)
  }

  const expectedState = req.cookies.oidc_state
  const codeVerifier = req.cookies.oidc_pkce_verifier
  const expectedNonce = req.cookies.oidc_nonce
  const callbackUrl = req.cookies.oidc_callback_url

  if (!expectedState || state !== expectedState) return failRedirect(res)
  if (!codeVerifier || !expectedNonce) return failRedirect(res)

  const issuer = oidcIssuer
  const clientId = oidcClientId
  const clientSecret = process.env[OIDC_CLIENT_SECRET_ENV_KEY]
  const redirectUri = oidcRedirectUri

  if (!issuer || !clientId || !clientSecret || !redirectUri) {
    return failRedirect(res, 'server_error')
  }

  try {
    const tokenUrl = oidcTokenUrl || getTokenUrl(issuer)

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier
      }),
      signal: AbortSignal.timeout(OIDC_REQUEST_TIMEOUT_MS)
    })

    const data = await tokenRes.json()

    if (!tokenRes.ok) {
      console.error('Token exchange failed:', {
        status: tokenRes.status,
        error: data.error
      })
      return failRedirect(res)
    }

    const metadata = await getOidcMetadata(issuer)
    const { payload } = await jwtVerify(data.id_token, metadata.jwks, {
      issuer: metadata.issuer,
      audience: clientId
    })

    if (payload.nonce !== expectedNonce) return failRedirect(res)

    // Validate required claims — throws if any are missing or empty
    getRequiredStringClaim(payload, 'sub')
    getRequiredStringClaim(payload, 'email')
    getRequiredStringClaim(payload, 'name')
    getRequiredStringClaim(payload, 'iss')

    if (typeof data.access_token !== 'string' || !data.access_token) {
      console.error('Token exchange response missing access_token')
      return failRedirect(res)
    }

    const introspection = await introspectAccessToken(
      data.access_token,
      issuer,
      clientId,
      clientSecret
    )

    if (introspection.status !== 'active') {
      console.error('OIDC callback token introspection failed:', {
        status: introspection.status
      })
      return failRedirect(
        res,
        introspection.status === 'inactive' ? 'access_denied' : 'server_error'
      )
    }

    const upstreamIdp = getLoginSource(payload)

    res.setHeader('Set-Cookie', [
      ...buildAuthCookieStrings(data, upstreamIdp),
      ...buildClearTransientCookieStrings()
    ])

    // Always return to /auth/login so the onboarding flow (wallet + SSI) can run.
    // The login page then redirects to callbackUrl when onboarding is complete.
    return res.redirect(
      302,
      buildLoginRedirect({
        hydrated: '1',
        ...(callbackUrl ? { callbackUrl } : {})
      })
    )
  } catch (err) {
    console.error('OIDC callback error:', err)
    return failRedirect(res)
  }
}
