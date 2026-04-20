import { NextRequest, NextResponse } from 'next/server'
import {
  buildAuthLoginRedirect,
  isProtectedAuthRoute
} from './src/@utils/authGuard'
import { readSession } from './src/server/auth/session'

const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true'

export async function middleware(request: NextRequest) {
  if (!authEnabled) {
    return NextResponse.next()
  }

  const { pathname, search } = request.nextUrl

  if (!isProtectedAuthRoute(pathname)) {
    return NextResponse.next()
  }

  const session = await readSession(request)

  if (session) {
    return NextResponse.next()
  }

  return NextResponse.redirect(
    new URL(buildAuthLoginRedirect(`${pathname}${search}`), request.url)
  )
}

export const config = {
  matcher: ['/profile/:path*', '/publish/:path*', '/bookmarks']
}
