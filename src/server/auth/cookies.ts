interface CookieOptions {
  httpOnly?: boolean
  maxAge?: number
  path?: string
  sameSite?: 'lax' | 'strict' | 'none'
  secure?: boolean
  expires?: Date
}

export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`]

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`)
  }

  parts.push(`Path=${options.path || '/'}`)

  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`)
  }

  if (options.httpOnly) {
    parts.push('HttpOnly')
  }

  if (options.secure) {
    parts.push('Secure')
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`)
  }

  return parts.join('; ')
}

export function expiredCookie(name: string): string {
  return serializeCookie(name, '', {
    expires: new Date(0),
    maxAge: 0,
    path: '/',
    sameSite: 'lax'
  })
}
