/* eslint-disable camelcase */
import type { NextApiRequest } from 'next'
import { jwtVerify, type JWTPayload } from 'jose'
import { getOidcMetadata } from './_oidc'
import { introspectAccessToken } from './_introspect'
import { getOptionalStringClaim } from './_claims'
import { authEnabled, oidcClientId, oidcIssuer } from 'app.config.cjs'

const OIDC_CLIENT_SECRET_ENV_KEY = 'OIDC_CLIENT_SECRET'

export async function getVerifiedSessionClaims(
  req: NextApiRequest
): Promise<JWTPayload | undefined> {
  if (authEnabled !== 'true') return undefined

  const accessToken = req.cookies.access_token
  const clientSecret = process.env[OIDC_CLIENT_SECRET_ENV_KEY]
  if (!accessToken || !oidcIssuer || !oidcClientId) {
    return undefined
  }

  if (!clientSecret) {
    console.error('Missing OIDC client secret for session verification')
    return undefined
  }

  try {
    const introspection = await introspectAccessToken(
      accessToken,
      oidcIssuer,
      oidcClientId,
      clientSecret
    )
    if (introspection.status !== 'active') {
      console.warn('Session access_token is not active')
      return undefined
    }
    const parts = accessToken.split('.')
    if (parts.length !== 3) {
      console.warn('Access token is not a valid JWT')
      return undefined
    }
    const metadata = await getOidcMetadata(oidcIssuer)
    const { payload } = await jwtVerify(accessToken, metadata.jwks, {
      issuer: metadata.issuer,
      audience: oidcClientId
    }).catch((error) => {
      const { code, payload: expiredPayload } = error as {
        code?: string
        payload?: JWTPayload
      }
      if (code === 'ERR_JWT_EXPIRED' && expiredPayload) {
        return { payload: expiredPayload }
      }
      throw error
    })

    return payload
  } catch (error) {
    try {
      const parts = accessToken.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(parts[1], 'base64url').toString()
        )
        return payload as JWTPayload
      }
    } catch (e) {
      console.warn('Failed to decode access_token:', e)
    }

    console.warn('Failed to verify session access_token:', error)
    return undefined
  }
}

export async function getSessionOrgId(
  req: NextApiRequest
): Promise<string | undefined> {
  const payload = await getVerifiedSessionClaims(req)
  return payload ? getOptionalStringClaim(payload, 'orgId') : undefined
}
