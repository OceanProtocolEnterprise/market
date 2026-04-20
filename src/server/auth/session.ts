import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import type { NextApiRequest } from 'next'
import type { NextRequest } from 'next/server'
import type { User } from '@hooks/stores/authStore'
import { serializeCookie, expiredCookie } from './cookies'
import { getServerAuthConfig } from './config'

export const AUTH_SESSION_COOKIE = 'market_auth_session'
export const AUTH_STATE_COOKIE = 'market_auth_state'
export const AUTH_NONCE_COOKIE = 'market_auth_nonce'
export const AUTH_PKCE_COOKIE = 'market_auth_pkce_verifier'
export const AUTH_CALLBACK_COOKIE = 'market_auth_callback_url'

const SESSION_DURATION_SECONDS = 60 * 60 * 12
const TRANSIENT_COOKIE_DURATION_SECONDS = 60 * 10

interface SessionClaims {
  sub: string
  email?: string
  name?: string
  username?: string
  idTokenHint?: string
  exp: number
}

function getSessionSecret() {
  const config = getServerAuthConfig()

  if (!config.sessionSecret) {
    throw new Error('Missing AUTH_SESSION_SECRET or OIDC client secret')
  }

  return new TextEncoder().encode(config.sessionSecret)
}

function isSecureCookie() {
  return process.env.NODE_ENV === 'production'
}

export function getSafeCallbackUrl(candidate: unknown): string | null {
  if (typeof candidate !== 'string' || candidate.length === 0) {
    return null
  }

  if (!candidate.startsWith('/') || candidate.startsWith('//')) {
    return null
  }

  return candidate
}

export async function createSessionToken(
  payload: Omit<SessionClaims, 'exp'> & {
    exp?: number
  }
) {
  const expiresAt =
    payload.exp || Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS

  return new SignJWT({
    email: payload.email,
    name: payload.name,
    username: payload.username,
    idTokenHint: payload.idTokenHint
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getSessionSecret())
}

export async function verifySessionToken(
  token: string
): Promise<SessionClaims | null> {
  try {
    const verified = await jwtVerify(token, getSessionSecret(), {
      algorithms: ['HS256']
    })
    const payload = verified.payload as JWTPayload & {
      email?: string
      name?: string
      username?: string
      idTokenHint?: string
    }

    if (!payload.sub || !payload.exp) {
      return null
    }

    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      username: payload.username,
      idTokenHint: payload.idTokenHint,
      exp: payload.exp
    }
  } catch {
    return null
  }
}

export function getSessionCookieValue(
  request: NextApiRequest | NextRequest
): string | undefined {
  if ('cookies' in request && typeof request.cookies.get === 'function') {
    return request.cookies.get(AUTH_SESSION_COOKIE)?.value
  }

  return request.cookies?.[AUTH_SESSION_COOKIE]
}

export async function readSession(
  request: NextApiRequest | NextRequest
): Promise<SessionClaims | null> {
  const token = getSessionCookieValue(request)

  if (!token) return null

  return verifySessionToken(token)
}

export function getSessionUser(session: SessionClaims | null): User | null {
  if (!session) return null

  return {
    id: session.sub,
    email: session.email || '',
    name:
      session.name || session.username || session.email || 'Marketplace User',
    username: session.username,
    isOnboarded: false,
    authProvider: 'oidc'
  }
}

export function createSessionCookie(token: string, expiresAt: number) {
  return serializeCookie(AUTH_SESSION_COOKIE, token, {
    httpOnly: true,
    maxAge: Math.max(0, expiresAt - Math.floor(Date.now() / 1000)),
    path: '/',
    sameSite: 'lax',
    secure: isSecureCookie()
  })
}

export function clearSessionCookie() {
  return expiredCookie(AUTH_SESSION_COOKIE)
}

export function createTransientCookie(name: string, value: string) {
  return serializeCookie(name, value, {
    httpOnly: true,
    maxAge: TRANSIENT_COOKIE_DURATION_SECONDS,
    path: '/',
    sameSite: 'lax',
    secure: isSecureCookie()
  })
}

export function clearTransientCookie(name: string) {
  return expiredCookie(name)
}
