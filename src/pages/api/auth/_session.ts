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
  const idToken = req.cookies.id_token
  const clientSecret = process.env[OIDC_CLIENT_SECRET_ENV_KEY]
  if (!accessToken || !idToken || !oidcIssuer || !oidcClientId) {
    return undefined
  }

  if (!clientSecret) {
    console.error('Missing OIDC client secret for session verification')
    return undefined
  }

  try {
    const metadata = await getOidcMetadata(oidcIssuer)
    const { payload } = await jwtVerify(idToken, metadata.jwks, {
      issuer: metadata.issuer,
      audience: oidcClientId
    }).catch((error) => {
      const { code, payload: expiredPayload } = error as {
        code?: string
        payload?: JWTPayload
      }
      if (code !== 'ERR_JWT_EXPIRED' || !expiredPayload) throw error
      return { payload: expiredPayload }
    })

    const introspection = await introspectAccessToken(
      accessToken,
      oidcIssuer,
      oidcClientId,
      clientSecret
    )
    if (introspection.status !== 'active') return undefined

    return payload
  } catch (error) {
    console.warn('Failed to verify session id_token:', error)
    return undefined
  }
}

export async function getSessionOrgId(
  req: NextApiRequest
): Promise<string | undefined> {
  const payload = await getVerifiedSessionClaims(req)
  return payload ? getOptionalStringClaim(payload, 'orgId') : undefined
}
