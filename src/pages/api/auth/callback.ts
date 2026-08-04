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
  console.log(`[CALLBACK] ❌ Redirecting to login with error: ${reason}`)
  res.setHeader('Set-Cookie', buildClearTransientCookieStrings())
  return res.redirect(302, buildLoginRedirect({ error: reason }))
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('[CALLBACK] ====== OIDC CALLBACK STARTED ======')
  console.log(`[CALLBACK] Method: ${req.method}`)
  console.log(`[CALLBACK] Query params:`, req.query)
  console.log(`[CALLBACK] Cookies:`, Object.keys(req.cookies))

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    console.log('[CALLBACK] ❌ Method not allowed')
    return res.status(405).end()
  }

  if (authEnabled !== 'true') {
    console.log('[CALLBACK] ❌ Auth not enabled')
    return res.status(404).end()
  }

  const { code, state, error } = req.query

  if (error) {
    console.log(`[CALLBACK] ❌ Error query param: ${error}`)
    return failRedirect(res)
  }

  if (typeof code !== 'string' || typeof state !== 'string') {
    console.log('[CALLBACK] ❌ Missing code or state')
    console.log(`  code: ${code}, type: ${typeof code}`)
    console.log(`  state: ${state}, type: ${typeof state}`)
    return failRedirect(res)
  }

  console.log(`[CALLBACK] ✅ Code: ${code.substring(0, 10)}...`)
  console.log(`[CALLBACK] ✅ State: ${state.substring(0, 10)}...`)

  const expectedState = req.cookies.oidc_state
  const codeVerifier = req.cookies.oidc_pkce_verifier
  const expectedNonce = req.cookies.oidc_nonce
  const callbackUrl = req.cookies.oidc_callback_url

  console.log(`[CALLBACK] Cookies check:`)
  console.log(`  oidc_state present: ${!!expectedState}`)
  console.log(`  oidc_pkce_verifier present: ${!!codeVerifier}`)
  console.log(`  oidc_nonce present: ${!!expectedNonce}`)
  console.log(`  oidc_callback_url: ${callbackUrl}`)

  if (!expectedState || state !== expectedState) {
    console.log('[CALLBACK] ❌ State mismatch')
    console.log(`  Expected: ${expectedState?.substring(0, 10)}...`)
    console.log(`  Received: ${state.substring(0, 10)}...`)
    return failRedirect(res)
  }

  if (!codeVerifier || !expectedNonce) {
    console.log('[CALLBACK] ❌ Missing code verifier or nonce')
    return failRedirect(res)
  }

  const issuer = oidcIssuer
  const clientId = oidcClientId
  const clientSecret = process.env[OIDC_CLIENT_SECRET_ENV_KEY]
  const redirectUri = oidcRedirectUri

  console.log(`[CALLBACK] OIDC Config:`)
  console.log(`  issuer: ${issuer}`)
  console.log(`  clientId: ${clientId}`)
  console.log(`  redirectUri: ${redirectUri}`)
  console.log(`  clientSecret present: ${!!clientSecret}`)

  if (!issuer || !clientId || !clientSecret || !redirectUri) {
    console.log('[CALLBACK] ❌ Missing OIDC configuration')
    return failRedirect(res, 'server_error')
  }

  try {
    const tokenUrl = oidcTokenUrl || getTokenUrl(issuer)
    console.log(`[CALLBACK] 🔄 Token URL: ${tokenUrl}`)

    console.log('[CALLBACK] 🔄 Exchanging code for tokens...')
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
    console.log(`[CALLBACK] Token response status: ${tokenRes.status}`)

    if (!tokenRes.ok) {
      console.error('[CALLBACK] ❌ Token exchange failed:', {
        status: tokenRes.status,
        error: data.error,
        error_description: data.error_description
      })
      return failRedirect(res)
    }

    console.log('[CALLBACK] ✅ Token exchange successful')
    console.log(`  access_token present: ${!!data.access_token}`)
    console.log(`  id_token present: ${!!data.id_token}`)
    console.log(`  refresh_token present: ${!!data.refresh_token}`)

    console.log('[CALLBACK] 🔄 Verifying id_token...')
    const metadata = await getOidcMetadata(issuer)
    const { payload } = await jwtVerify(data.id_token, metadata.jwks, {
      issuer: metadata.issuer,
      audience: clientId
    })

    console.log(`[CALLBACK] id_token claims:`, Object.keys(payload))
    console.log(`  sub: ${payload.sub}`)
    console.log(`  email: ${payload.email}`)
    console.log(`  name: ${payload.name}`)
    console.log(`  nonce in token: ${payload.nonce}`)
    console.log(`  expected nonce: ${expectedNonce}`)

    if (payload.nonce !== expectedNonce) {
      console.log('[CALLBACK] ❌ Nonce mismatch')
      return failRedirect(res)
    }

    // Validate required claims
    getRequiredStringClaim(payload, 'sub')
    getRequiredStringClaim(payload, 'email')
    getRequiredStringClaim(payload, 'name')
    getRequiredStringClaim(payload, 'iss')

    if (typeof data.access_token !== 'string' || !data.access_token) {
      console.error(
        '[CALLBACK] ❌ Token exchange response missing access_token'
      )
      return failRedirect(res)
    }

    console.log('[CALLBACK] 🔄 Introspecting access token...')
    const introspection = await introspectAccessToken(
      data.access_token,
      issuer,
      clientId,
      clientSecret
    )

    console.log(`[CALLBACK] Introspection status: ${introspection.status}`)

    if (introspection.status !== 'active') {
      console.error('[CALLBACK] ❌ Token introspection failed:', {
        status: introspection.status
      })
      return failRedirect(
        res,
        introspection.status === 'inactive' ? 'access_denied' : 'server_error'
      )
    }

    const upstreamIdp = getLoginSource(payload)
    console.log(`[CALLBACK] ✅ Upstream IDP: ${upstreamIdp}`)

    // Set authentication cookies
    const authCookies = buildAuthCookieStrings(data, upstreamIdp)
    const clearCookies = buildClearTransientCookieStrings()

    console.log(`[CALLBACK] Setting ${authCookies.length} auth cookies`)
    console.log(
      `[CALLBACK] Setting ${clearCookies.length} clear transient cookies`
    )

    res.setHeader('Set-Cookie', [...authCookies, ...clearCookies])

    const redirectTarget = buildLoginRedirect({
      hydrated: '1',
      ...(callbackUrl ? { callbackUrl } : {})
    })

    console.log(`[CALLBACK] ✅ Redirecting to: ${redirectTarget}`)
    console.log('[CALLBACK] ====== OIDC CALLBACK COMPLETED ======')

    return res.redirect(302, redirectTarget)
  } catch (err) {
    console.error('[CALLBACK] ❌ OIDC callback error:', err)
    return failRedirect(res)
  }
}
