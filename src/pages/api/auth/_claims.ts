import type { JWTPayload } from 'jose'

export function getOptionalStringClaim(
  payload: JWTPayload,
  claim: string
): string | undefined {
  const value = payload[claim]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export function getLoginSource(payload: JWTPayload): string | undefined {
  return (
    getOptionalStringClaim(payload, 'upstream_idp') ||
    getOptionalStringClaim(payload, 'last_idp') ||
    getOptionalStringClaim(payload, 'idp') ||
    getOptionalStringClaim(payload, 'source') ||
    getOptionalStringClaim(payload, 'provider') ||
    (Array.isArray(payload.amr) && typeof payload.amr[0] === 'string'
      ? payload.amr[0]
      : undefined)
  )
}

export function getWellKnownUrl(payload: JWTPayload): string | undefined {
  return getOptionalStringClaim(payload, 'wellKnownUrl')
}
