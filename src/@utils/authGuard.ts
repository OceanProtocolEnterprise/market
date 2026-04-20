const protectedRoutePrefixes = ['/profile', '/publish', '/bookmarks']

export function isProtectedAuthRoute(path: string): boolean {
  const [pathname] = path.split('?')
  const normalizedPath =
    pathname !== '/' && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname

  return protectedRoutePrefixes.some(
    (prefix) =>
      normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
  )
}

export function buildAuthLoginRedirect(path: string): string {
  return `/auth/login?callbackUrl=${encodeURIComponent(path)}`
}
