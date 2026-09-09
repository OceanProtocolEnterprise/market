import Cookies from 'js-cookie'

enum SAME_SITE_OPTIONS {
  STRICT = 'strict',
  LAX = 'lax',
  NONE = 'none'
}

const DEFAULT_COOKIE_OPTIONS: CookieOptions = {
  expires: 365,
  sameSite: SAME_SITE_OPTIONS.STRICT
}

export interface CookieOptions {
  expires: number
  sameSite: SAME_SITE_OPTIONS
}

function isSecureCookieContext(): boolean {
  if (typeof window === 'undefined') return true
  return window.location.protocol === 'https:'
}

function getLegacyCookieName(cookieName: string): string {
  return `${cookieName}-legacy`
}

export function getCookieValue(cookieName: string): string | undefined {
  let cookieValue = Cookies.get(cookieName)

  if (cookieValue === undefined) {
    cookieValue = Cookies.get(getLegacyCookieName(cookieName))
  }
  return cookieValue
}

export function setCookie(
  cookieName: string,
  cookieValue: string | boolean,
  cookieOptions: CookieOptions = DEFAULT_COOKIE_OPTIONS
): void {
  const options = { ...cookieOptions, secure: isSecureCookieContext() }

  if (cookieOptions.sameSite === SAME_SITE_OPTIONS.NONE)
    Cookies.set(getLegacyCookieName(cookieName), cookieValue.toString(), {
      ...options,
      sameSite: null
    })

  Cookies.set(cookieName, cookieValue.toString(), options)
}

export function deleteCookie(cookieName: string): void {
  const secure = isSecureCookieContext()

  Cookies.remove(cookieName, {
    sameSite: DEFAULT_COOKIE_OPTIONS.sameSite,
    secure
  })
  Cookies.remove(getLegacyCookieName(cookieName), {
    sameSite: null,
    secure
  })
}

export function setJsonCookie(
  cookieName: string,
  value: unknown,
  expiresDays: number
): void {
  setCookie(cookieName, JSON.stringify(value), {
    expires: expiresDays,
    sameSite: SAME_SITE_OPTIONS.STRICT
  })
}

export function getJsonCookie<T>(cookieName: string): T | undefined {
  const rawValue = getCookieValue(cookieName)
  if (rawValue === undefined) return undefined

  try {
    return JSON.parse(rawValue) as T
  } catch {
    return undefined
  }
}
