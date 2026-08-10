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
import { AUTH_SESSION_LOST_EVENT, OIDC_LOGOUT_PENDING_KEY } from './_constants'

type SessionResponse = {
  user?: {
    id?: string
    email?: string
    name?: string
    username?: string
    organizationId?: string
  }
  authMeta?: Record<string, unknown>
  expires_in?: number
  refresh_required?: boolean
  has_refresh_token?: boolean
}

type SessionVerificationResult = {
  user: User | null
  hasRefreshToken: boolean
  refreshRequired: boolean
  /**
   * Access-token lifetime in seconds, as reported by /api/auth/session.
   * `null` when the session is not valid or the server did not return a
   * usable value.
   */
  expiresIn: number | null
}

const getUserDataFromSessionResponse = (user: {
  id?: string
  email?: string
  name?: string
  username?: string
  organizationId?: string
}): User => {
  return {
    id: user.id || '',
    email: user.email || '',
    name: user.name || '',
    username: user.username,
    organizationId: user.organizationId,
    avatar: `https://ui-avatars.com/api/?name=${user.name || ''}`,
    isOnboarded: false,
    authProvider: 'oidc'
  }
}

const clearOidcStorage = () => {
  localStorage.removeItem('oidc_session')
  localStorage.removeItem('token_expires_at')
  localStorage.removeItem('auth_meta')
  sessionStorage.removeItem(OIDC_LOGOUT_PENDING_KEY)
  clearPendingAuthMode()
  clearPendingCallbackUrl()
}

const clearStoredSessionData = () => {
  localStorage.removeItem('oidc_session')
  localStorage.removeItem('token_expires_at')
  localStorage.removeItem('auth_meta')
}

const clearStoredAuthState = () => {
  clearStoredSessionData()
  useAuthStore.getState().logout()
}

const hasStoredSessionData = () => {
  if (typeof window === 'undefined') return false
  return Boolean(localStorage.getItem('oidc_session'))
}

const notifySessionLost = (reason: string) => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(AUTH_SESSION_LOST_EVENT, {
      detail: { reason }
    })
  )
}

const persistVerifiedSession = (data: SessionResponse) => {
  if (!data.user) {
    clearStoredSessionData()
    return null
  }

  const userData = getUserDataFromSessionResponse(data.user)
  localStorage.setItem('oidc_session', JSON.stringify(userData))
  localStorage.setItem(
    'token_expires_at',
    String(Date.now() + (data.expires_in ?? 3600) * 1000)
  )

  if (data.authMeta) {
    localStorage.setItem('auth_meta', JSON.stringify(data.authMeta))
  } else {
    localStorage.removeItem('auth_meta')
  }

  return userData
}

async function fetchSessionResponse(): Promise<{
  response: Response
  data: SessionResponse
}> {
  const response = await fetch('/api/auth/session', {
    credentials: 'include'
  })
  const data = (await response.json().catch(() => ({}))) as SessionResponse
  return { response, data }
}

function isDefinitiveAuthFailure(status: number): boolean {
  return status === 400 || status === 401 || status === 403
}

function readExpiresIn(data: SessionResponse): number | null {
  return typeof data.expires_in === 'number' && data.expires_in > 0
    ? data.expires_in
    : null
}

export async function verifyAuthSessionDetailed({
  allowRefresh = true
}: {
  allowRefresh?: boolean
} = {}): Promise<SessionVerificationResult> {
  const hadStoredSession = hasStoredSessionData()
  const { response, data } = await fetchSessionResponse()
  const hasRefreshToken = Boolean(data.has_refresh_token)
  let definitiveFailureReason = `session_${response.status}`

  if (response.ok) {
    return {
      user: persistVerifiedSession(data),
      hasRefreshToken,
      refreshRequired: false,
      expiresIn: readExpiresIn(data)
    }
  }

  if (!allowRefresh && data.refresh_required && hasRefreshToken) {
    return {
      user: null,
      hasRefreshToken,
      refreshRequired: true,
      expiresIn: null
    }
  }

  if (allowRefresh && data.refresh_required) {
    const refreshResponse = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include'
    })

    if (refreshResponse.ok) {
      const { response: retryResponse, data: retryData } =
        await fetchSessionResponse()
      if (retryResponse.ok) {
        return {
          user: persistVerifiedSession(retryData),
          hasRefreshToken: Boolean(retryData.has_refresh_token),
          refreshRequired: false,
          expiresIn: readExpiresIn(retryData)
        }
      }

      if (!isDefinitiveAuthFailure(retryResponse.status)) {
        throw new Error(
          `Session verification retry failed with status ${retryResponse.status}`
        )
      }

      definitiveFailureReason = `session_retry_${retryResponse.status}`
    } else if (!isDefinitiveAuthFailure(refreshResponse.status)) {
      throw new Error(
        `Session refresh failed with status ${refreshResponse.status}`
      )
    } else {
      definitiveFailureReason = `refresh_${refreshResponse.status}`
    }
  }

  if (!isDefinitiveAuthFailure(response.status)) {
    throw new Error(
      `Session verification failed with status ${response.status}`
    )
  }

  clearStoredAuthState()
  if (hadStoredSession) notifySessionLost(definitiveFailureReason)

  return {
    user: null,
    hasRefreshToken,
    refreshRequired: Boolean(data.refresh_required),
    expiresIn: null
  }
}

export async function verifyAuthSession({
  allowRefresh = true
}: {
  allowRefresh?: boolean
} = {}): Promise<User | null> {
  const result = await verifyAuthSessionDetailed({ allowRefresh })
  return result.user
}

export const useAuth = () => {
  const {
    user,
    isLoading,
    isSessionVerified,
    isLogoutPending,
    setUser,
    setLoading,
    setSessionVerified,
    setLogoutPending,
    setExpiresAt,
    logout: storeLogout
  } = useAuthStore()
  const authEnabled = authConfig.enabled
  const router = useRouter()
  const routerRef = React.useRef(router)
  routerRef.current = router

  const applyVerificationResult = React.useCallback(
    (result: SessionVerificationResult | null) => {
      const verifiedUser = result?.user ?? null
      setUser(verifiedUser)
      setExpiresAt(
        verifiedUser && result?.expiresIn
          ? Date.now() + result.expiresIn * 1000
          : null
      )
    },
    [setUser, setExpiresAt]
  )

  // Server session is the source of truth; localStorage is only a verified UI cache.
  React.useEffect(() => {
    if (!authEnabled || isSessionVerified) return

    let cancelled = false

    const hydrate = async () => {
      if (
        typeof window !== 'undefined' &&
        sessionStorage.getItem(OIDC_LOGOUT_PENDING_KEY) === 'true'
      ) {
        setSessionVerified(true)
        return
      }

      setLoading(true)
      try {
        const result = await verifyAuthSessionDetailed()
        if (cancelled) return
        applyVerificationResult(result)
      } catch {
        if (cancelled) return
        applyVerificationResult(null)
      } finally {
        if (!cancelled) {
          setSessionVerified(true)
          setLoading(false)
        }
      }
    }

    hydrate()

    return () => {
      cancelled = true
    }
  }, [
    authEnabled,
    isSessionVerified,
    setLoading,
    setSessionVerified,
    applyVerificationResult
  ])

  // After server-driven callback, ?hydrated=1 signals us to fetch session data
  React.useEffect(() => {
    if (!router.isReady) return
    if (router.query.hydrated !== '1') return

    const rest = { ...router.query }
    delete rest.hydrated
    router.replace({ pathname: router.pathname, query: rest }, undefined, {
      shallow: true
    })

    setLoading(true)
    verifyAuthSessionDetailed()
      .then((result) => applyVerificationResult(result))
      .catch(() => applyVerificationResult(null))
      .finally(() => {
        setSessionVerified(true)
        setLoading(false)
      })
  }, [router, setLoading, setSessionVerified, applyVerificationResult])

  const clearLocalSession = React.useCallback(
    (redirectTo = '/auth/login') => {
      clearOidcStorage()
      setLogoutPending(false)
      storeLogout()

      if (redirectTo.startsWith('/api/')) {
        window.location.href = redirectTo
        return
      }

      routerRef.current.replace(redirectTo)
    },
    [setLogoutPending, storeLogout]
  )

  const markLogoutPending = React.useCallback(() => {
    setLogoutPending(true)
    sessionStorage.setItem(OIDC_LOGOUT_PENDING_KEY, 'true')
  }, [setLogoutPending])

  const login = async (mode: PendingAuthMode = 'login') => {
    setLoading(true)
    try {
      const callbackUrl =
        typeof router.query.callbackUrl === 'string'
          ? router.query.callbackUrl
          : null
      clearOidcStorage()
      setPendingAuthMode(mode)
      if (callbackUrl) {
        setPendingCallbackUrl(callbackUrl)
      } else {
        clearPendingCallbackUrl()
      }

      const params = new URLSearchParams()
      if (callbackUrl) params.set('callbackUrl', callbackUrl)
      const qs = params.toString() ? `?${params.toString()}` : ''
      window.location.href =
        mode === 'signup' ? `/api/auth/signup${qs}` : `/api/auth/login${qs}`
    } finally {
      setLoading(false)
    }
  }

  const beginOidcFlow = async (mode: PendingAuthMode) => {
    await login(mode)
  }

  const logout = async () => {
    setLoading(true)
    try {
      if (user?.authProvider === 'oidc') {
        clearOidcStorage()
        markLogoutPending()
        storeLogout()
        window.location.href = '/api/auth/logout'
        return
      }

      clearLocalSession()
    } catch (error) {
      setLogoutPending(false)
      console.error('Logout flow failed:', error)
      toast.error('Logout failed')
    } finally {
      setLoading(false)
    }
  }

  return {
    user,
    isLoading: authEnabled && !isSessionVerified ? true : isLoading,
    isLogoutPending,
    isSessionVerified,
    isAuthenticated: !!user,
    login,
    beginOidcFlow,
    logout,
    markLogoutPending,
    clearLocalSession,
    authEnabled
  }
}
