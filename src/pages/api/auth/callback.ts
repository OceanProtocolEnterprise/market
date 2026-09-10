/* eslint-disable camelcase */
import type { NextApiRequest, NextApiResponse } from 'next'
import { jwtVerify, type JWTPayload } from 'jose'
import { buildAuthCookieStrings } from './_cookies'
import { buildClearTransientCookieStrings } from './_transient'
import { getOidcMetadata } from './_oidc'
import { OIDC_REQUEST_TIMEOUT_MS } from './_constants'
import { introspectAccessToken } from './_introspect'
import { getLoginSource, getWellKnownUrl } from './_claims'
import { isMainProviderByName, getProviderEndSessionUrl } from './_federated'
import {
  authEnabled,
  oidcClientId,
  oidcIssuer,
  oidcRedirectUri,
  oidcTokenUrl
} from 'app.config.cjs'

const OIDC_CLIENT_SECRET_ENV_KEY = 'OIDC_CLIENT_SECRET'

function getTokenUrl(issuer: string): string {
  if (!issuer || typeof issuer !== 'string') {
    throw new Error('Issuer is required to build token URL')
  }

  if (issuer.includes('/application/o/')) {
    const base = issuer.split('/application/o/')[0]
    return `${base}/application/o/token/`
  }
  return `${issuer.replace(/\/$/, '')}/token/`
}

function getRequiredStringClaim(payload: JWTPayload, claim: string): string {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid payload for claim extraction')
  }

  const value = payload[claim]
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`access_token missing required claim: ${claim}`)
  }
  return value
}

function buildLoginRedirect(params: Record<string, string>): string {
  try {
    const qs = new URLSearchParams(params).toString()
    return `/auth/login${qs ? `?${qs}` : ''}`
  } catch (error) {
    console.error('buildLoginRedirect failed:', error)
    return '/auth/login'
  }
}

function failRedirect(res: NextApiResponse, reason = 'auth_failed') {
  try {
    res.setHeader('Set-Cookie', buildClearTransientCookieStrings())
  } catch (error) {
    console.error('Failed to clear transient cookies on redirect:', error)
  }
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
    console.error('Callback missing required code or state')
    return failRedirect(res)
  }

  const expectedState = req.cookies.oidc_state
  const codeVerifier = req.cookies.oidc_pkce_verifier
  const expectedNonce = req.cookies.oidc_nonce
  const callbackUrl = req.cookies.oidc_callback_url

  if (!expectedState || state !== expectedState) {
    console.error('Callback state mismatch')
    return failRedirect(res)
  }
  if (!codeVerifier || !expectedNonce) {
    console.error('Callback missing code verifier or nonce')
    return failRedirect(res)
  }

  const issuer = oidcIssuer
  const clientId = oidcClientId
  const clientSecret = process.env[OIDC_CLIENT_SECRET_ENV_KEY]
  const redirectUri = oidcRedirectUri

  if (!issuer || !clientId || !clientSecret || !redirectUri) {
    console.error('Missing OIDC configuration for callback')
    return failRedirect(res, 'server_error')
  }

  try {
    let tokenUrl: string
    try {
      tokenUrl = oidcTokenUrl || getTokenUrl(issuer)
    } catch (urlError) {
      console.error('Failed to build token URL:', urlError)
      return failRedirect(res, 'server_error')
    }

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

    let data: Record<string, unknown>
    try {
      data = await tokenRes.json()
    } catch (jsonError) {
      console.error('Failed to parse token response JSON:', jsonError)
      return failRedirect(res)
    }

    if (!tokenRes.ok) {
      console.error('Token exchange failed:', {
        status: tokenRes.status,
        error: data.error
      })
      return failRedirect(res)
    }

    if (typeof data.access_token !== 'string' || !data.access_token) {
      console.error('Token exchange response missing access_token')
      return failRedirect(res)
    }

    let metadata: Awaited<ReturnType<typeof getOidcMetadata>>
    try {
      metadata = await getOidcMetadata(issuer)
    } catch (metaError) {
      console.error('Failed to load OIDC metadata:', metaError)
      return failRedirect(res, 'server_error')
    }

    let payload: JWTPayload
    try {
      const { payload: verifiedPayload } = await jwtVerify(
        data.access_token as string,
        metadata.jwks,
        {
          issuer: metadata.issuer,
          audience: clientId
        }
      )
      payload = verifiedPayload
    } catch (verifyError) {
      console.error('Access token verification failed:', verifyError)
      return failRedirect(res)
    }

    if (payload.nonce !== expectedNonce) {
      console.error('Callback nonce mismatch')
      return failRedirect(res)
    }

    try {
      getRequiredStringClaim(payload, 'sub')
      getRequiredStringClaim(payload, 'email')
      getRequiredStringClaim(payload, 'name')
      getRequiredStringClaim(payload, 'iss')
    } catch (claimError) {
      console.error('Missing required claim:', claimError)
      return failRedirect(res)
    }

    let introspection: Awaited<ReturnType<typeof introspectAccessToken>>
    try {
      introspection = await introspectAccessToken(
        data.access_token as string,
        issuer,
        clientId,
        clientSecret
      )
    } catch (introspectError) {
      console.error('Introspection call failed:', introspectError)
      return failRedirect(res, 'server_error')
    }

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
    const isMain = isMainProviderByName(upstreamIdp)
    let partnerEndSessionUrl: string | undefined

    const wellKnownUrl = getWellKnownUrl(payload)

    if (!isMain && wellKnownUrl) {
      try {
        partnerEndSessionUrl = await getProviderEndSessionUrl(
          wellKnownUrl,
          upstreamIdp
        )
      } catch (endSessionError) {
        console.warn(
          `Failed to get end_session_url for partner ${upstreamIdp}:`,
          endSessionError
        )
      }
    }

    try {
      const cookies = [
        ...buildAuthCookieStrings(
          {
            access_token: data.access_token as string,
            refresh_token:
              typeof data.refresh_token === 'string'
                ? data.refresh_token
                : undefined,
            expires_in:
              typeof data.expires_in === 'number' ? data.expires_in : undefined
          },
          upstreamIdp,
          partnerEndSessionUrl
        ),
        ...buildClearTransientCookieStrings()
      ]

      res.setHeader('Set-Cookie', cookies)
    } catch (cookieError) {
      console.error('Failed to set auth cookies:', cookieError)
      return failRedirect(res, 'server_error')
    }

    try {
      const metadataForFrontend = {
        upstreamIdp: upstreamIdp || 'main',
        wellKnownUrl: wellKnownUrl || '',
        partnerEndSessionUrl: partnerEndSessionUrl || '',
        isMainProvider: isMain,
        user: {
          id: getRequiredStringClaim(payload, 'sub'),
          email: getRequiredStringClaim(payload, 'email'),
          name: getRequiredStringClaim(payload, 'name'),
          organizationId: payload.orgId
        }
      }

      res.setHeader('X-Auth-Metadata', JSON.stringify(metadataForFrontend))
    } catch (metaHeaderError) {
      console.warn('Failed to set X-Auth-Metadata header:', metaHeaderError)
    }

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
