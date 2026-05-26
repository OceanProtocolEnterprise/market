// app/dfns-login/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function LoginContent() {
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const fetchToken = async () => {
    try {
      const response = await fetch('/api/dfns/get-token')
      const data = await response.json()
      if (data.token) {
        setToken(data.token)
        console.log('Dfns JWT Token:', data.token)
      }
    } catch (err) {
      console.error('Failed to fetch token:', err)
    }
  }

  const getErrorMessage = (errorCode: string): string => {
    const errors: Record<string, string> = {
      missing_auth_params: 'Missing authentication parameters',
      sso_completion_failed: 'Failed to complete SSO login',
      auth_failed: 'Authentication failed'
    }
    return errors[errorCode] || 'An error occurred during login'
  }

  useEffect(() => {
    const success = searchParams.get('success')
    const errorParam = searchParams.get('error')

    if (success === 'true') {
      setError(null)
      fetchToken()
    }

    if (errorParam) {
      setError(getErrorMessage(errorParam))
    }
  }, [searchParams])

  const handleLogin = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/dfns/initiate-sso', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate login')
      }

      if (data.ssoRedirectUrl) {
        window.location.href = data.ssoRedirectUrl
      } else {
        throw new Error('No redirect URL received')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'Failed to initiate login')
      setLoading(false)
    }
  }

  const handleLogout = () => {
    document.cookie =
      'dfns_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    setToken(null)
    setError(null)
    window.location.href = '/dfns-login'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Dfns SSO Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Authenticate via Authentik (OpenID)
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {token && (
          <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded relative">
            <details>
              <summary className="font-medium cursor-pointer">
                ✅ Login Successful! Click to view JWT Token
              </summary>
              <pre className="mt-2 text-xs overflow-auto max-h-40 p-2 bg-gray-100 rounded">
                {token}
              </pre>
            </details>
          </div>
        )}

        {!token ? (
          <button
            onClick={handleLogin}
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Redirecting to Authentik...' : 'Login with SSO'}
          </button>
        ) : (
          <button
            onClick={handleLogout}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Logout
          </button>
        )}

        <div className="text-xs text-gray-500 text-center mt-4">
          <p>You will be redirected to Authentik for authentication</p>
          <p className="mt-1">
            After successful login, you will be redirected back with your Dfns
            JWT token
          </p>
        </div>
      </div>
    </div>
  )
}

export default function DfnsLoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}
