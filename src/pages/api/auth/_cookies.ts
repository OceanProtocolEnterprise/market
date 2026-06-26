/* eslint-disable camelcase */
import crypto from 'crypto'
import type { NextApiResponse } from 'next'

const AUTH_COOKIE_NAMES = ['access_token', 'refresh_token', 'id_token'] as const
const EXTRA_SESSION_COOKIE_NAMES = ['dfns_token'] as const
export const CSRF_COOKIE_NAME = '__Host-csrf_token'
export const CSRF_HEADER_NAME = 'x-csrf-token'
export const DEFAULT_ACCESS_TOKEN_MAX_AGE = 3600
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60

type AuthCookieName = (typeof AUTH_COOKIE_NAMES)[number]

type AuthTokens = Partial<Record<AuthCookieName, string>> & {
  expires_in?: number
}

export function getAccessTokenMaxAge(tokens: AuthTokens) {
  return typeof tokens.expires_in === 'number' && tokens.expires_in > 0
    ? tokens.expires_in
    : DEFAULT_ACCESS_TOKEN_MAX_AGE
}

function serializeCookie(
  name: string,
  value: string,
  maxAge: number,
  path = '/'
) {
  return `${name}=${encodeURIComponent(
    value
  )}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict; Path=${path}`
}

function serializeSessionCookie(
  name: string,
  value: string,
  maxAge: number
): string {
  return `${name}=${encodeURIComponent(
    value
  )}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax; Path=/`
}

function serializeCsrfCookie(value: string, maxAge: number): string {
  return `${CSRF_COOKIE_NAME}=${encodeURIComponent(
    value
  )}; Max-Age=${maxAge}; Secure; SameSite=Strict; Path=/`
}

function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export function buildAuthCookieStrings(
  tokens: AuthTokens,
  loginSource?: string
): string[] {
  const accessTokenMaxAge = getAccessTokenMaxAge(tokens)
  return [
    tokens.access_token &&
      serializeCookie('access_token', tokens.access_token, accessTokenMaxAge),
    tokens.refresh_token &&
      serializeCookie(
        'refresh_token',
        tokens.refresh_token,
        REFRESH_TOKEN_MAX_AGE
      ),
    tokens.id_token &&
      serializeCookie('id_token', tokens.id_token, REFRESH_TOKEN_MAX_AGE),
    tokens.access_token &&
      serializeCsrfCookie(generateCsrfToken(), accessTokenMaxAge),
    loginSource &&
      serializeSessionCookie('login_source', loginSource, REFRESH_TOKEN_MAX_AGE)
  ].filter(Boolean) as string[]
}

export function buildClearAuthCookieStrings({
  keepIdToken = false
}: {
  keepIdToken?: boolean
} = {}): string[] {
  const authCookieNames = AUTH_COOKIE_NAMES.filter(
    (name) => !(keepIdToken && name === 'id_token')
  )

  return [
    ...authCookieNames.map((name) => serializeCookie(name, '', 0)),
    ...EXTRA_SESSION_COOKIE_NAMES.map((name) => serializeCookie(name, '', 0)),
    serializeCsrfCookie('', 0),
    serializeSessionCookie('login_source', '', 0)
  ].filter(Boolean) as string[]
}

export function setAuthCookies(res: NextApiResponse, tokens: AuthTokens) {
  const cookies = buildAuthCookieStrings(tokens)
  if (cookies.length > 0) res.setHeader('Set-Cookie', cookies)
}

export function clearAuthCookies(res: NextApiResponse) {
  res.setHeader('Set-Cookie', buildClearAuthCookieStrings())
}
