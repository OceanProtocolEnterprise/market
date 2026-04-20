import { useAuthStore, User } from './stores/authStore'
import { useRouter } from 'next/router'
import { toast } from 'react-toastify'
import { authConfig } from '../config/auth.config'
import React from 'react'
import {
  clearPendingAuthMode,
  clearPendingCallbackUrl,
  setPendingAuthMode,
  setPendingCallbackUrl,
  type PendingAuthMode
} from '@utils/authFlow'

const clearClientAuthState = () => {
  clearPendingAuthMode()
  clearPendingCallbackUrl()
}

export const useAuth = () => {
  const {
    user,
    isLoading,
    isLogoutPending,
    setUser,
    setLoading,
    setLogoutPending,
    logout: storeLogout
  } = useAuthStore()

  const authEnabled = authConfig.enabled
  const router = useRouter()

  const hydrateSession = React.useCallback(async () => {
    if (!authEnabled) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'same-origin'
      })

      if (!response.ok) {
        throw new Error(`Session request failed with status ${response.status}`)
      }

      const data = (await response.json()) as {
        user: User | null
        isAuthenticated: boolean
      }

      setUser(data.user)
    } catch (error) {
      console.error('Failed to hydrate auth session:', error)
      storeLogout()
    } finally {
      setLoading(false)
      setLogoutPending(false)
    }
  }, [authEnabled, setLoading, setLogoutPending, setUser, storeLogout])

  React.useEffect(() => {
    hydrateSession().catch((error) => {
      console.error('Auth hydration failed:', error)
    })
  }, [hydrateSession])

  const login = async (mode: PendingAuthMode = 'login') => {
    const callbackUrl =
      typeof router.query.callbackUrl === 'string'
        ? router.query.callbackUrl
        : null

    setPendingAuthMode(mode)

    if (callbackUrl) {
      setPendingCallbackUrl(callbackUrl)
    } else {
      clearPendingCallbackUrl()
    }

    const loginUrl = new URL('/api/auth/login', window.location.origin)
    loginUrl.searchParams.set('mode', mode)

    if (callbackUrl) {
      loginUrl.searchParams.set('callbackUrl', callbackUrl)
    }

    window.location.assign(loginUrl.toString())
  }

  const beginOidcFlow = async (mode: PendingAuthMode) => {
    await login(mode)
  }

  const logout = async () => {
    setLogoutPending(true)
    storeLogout()
    clearClientAuthState()

    try {
      window.location.assign('/api/auth/logout')
    } catch (error) {
      setLogoutPending(false)
      toast.error('Logout failed')
      console.error('Logout flow failed:', error)
    }
  }

  return {
    user,
    isLoading,
    isLogoutPending,
    isAuthenticated: !!user,
    login,
    beginOidcFlow,
    logout,
    refreshSession: hydrateSession,
    authEnabled
  }
}
