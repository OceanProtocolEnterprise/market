import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@hooks/useAuth'
import { buildAuthLoginRedirect, isProtectedAuthRoute } from '@utils/authGuard'

interface AuthGuardProps {
  children: ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, authEnabled } = useAuth()
  const router = useRouter()
  const isProtectedRoute = isProtectedAuthRoute(router.asPath)
  const shouldRedirectToLogin =
    authEnabled && isProtectedRoute && !isLoading && !isAuthenticated

  useEffect(() => {
    if (shouldRedirectToLogin) {
      router.replace(buildAuthLoginRedirect(router.asPath))
    }
  }, [router, router.asPath, shouldRedirectToLogin])

  if (!authEnabled || !isProtectedRoute) {
    return <>{children}</>
  }

  if (isLoading || shouldRedirectToLogin) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e2e8f0',
            borderTopColor: '#0a4b70',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }}
        />
      </div>
    )
  }

  return <>{children}</>
}
