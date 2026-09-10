/* eslint-disable camelcase */
import crypto from 'crypto'
import type { NextApiResponse } from 'next'

const TRANSIENT_MAX_AGE = 600

const TRANSIENT_NAMES = [
  'oidc_pkce_verifier',
  'oidc_state',
  'oidc_nonce',
  'oidc_callback_url'
] as const

type TransientName = (typeof TRANSIENT_NAMES)[number]
type TransientValues = Partial<Record<TransientName, string>>

function serialize(
  name: TransientName,
  value: string,
  maxAge: number = TRANSIENT_MAX_AGE
): string {
  return `${name}=${encodeURIComponent(
    value
  )}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax; Path=/api/auth`
}

export function buildTransientCookieStrings(values: TransientValues): string[] {
  if (!values || typeof values !== 'object') {
    console.error('buildTransientCookieStrings: invalid values provided')
    return []
  }

  try {
    return (Object.entries(values) as [TransientName, string | undefined][])
      .filter(
        (entry): entry is [TransientName, string] =>
          entry[1] !== undefined && entry[1] !== null
      )
      .map(([name, value]) => serialize(name, value))
  } catch (error) {
    console.error('buildTransientCookieStrings failed:', error)
    return []
  }
}

export function buildClearTransientCookieStrings(): string[] {
  try {
    return TRANSIENT_NAMES.map((name) => serialize(name, '', 0))
  } catch (error) {
    console.error('buildClearTransientCookieStrings failed:', error)
    return []
  }
}

export function setTransientCookies(
  res: NextApiResponse,
  values: TransientValues
) {
  if (!res || typeof res.setHeader !== 'function') {
    console.error('setTransientCookies: invalid response object')
    return
  }

  try {
    const strings = buildTransientCookieStrings(values)
    if (strings.length > 0) res.setHeader('Set-Cookie', strings)
  } catch (error) {
    console.error('setTransientCookies failed:', error)
  }
}

export function generateCodeVerifier(): string {
  try {
    return crypto.randomBytes(32).toString('base64url')
  } catch (error) {
    console.error('generateCodeVerifier failed:', error)
    throw new Error('Failed to generate code verifier')
  }
}

export function generateCodeChallenge(verifier: string): string {
  if (!verifier || typeof verifier !== 'string') {
    console.error('generateCodeChallenge: invalid verifier provided')
    throw new Error('Code verifier is required')
  }

  try {
    return crypto.createHash('sha256').update(verifier).digest('base64url')
  } catch (error) {
    console.error('generateCodeChallenge failed:', error)
    throw new Error('Failed to generate code challenge')
  }
}

export function generateRandomString(): string {
  try {
    return crypto.randomBytes(32).toString('hex')
  } catch (error) {
    console.error('generateRandomString failed:', error)
    throw new Error('Failed to generate random string')
  }
}

export function isSafeCallbackUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  return url.startsWith('/') && !url.startsWith('//')
}
