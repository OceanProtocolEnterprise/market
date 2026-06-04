import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccount, useConfig, useConnect } from 'wagmi'
import { useRouter } from 'next/router'
import { toast } from 'react-toastify'
import { useAuth } from '@hooks/useAuth'
import { useMarketMetadata } from '@context/MarketMetadata'
import { getRuntimeConfig } from '@utils/runtimeConfig'
import {
  DFNS_REGISTRATION_CODE_REQUIRED_MESSAGE,
  dfnsConnector,
  getDfnsSelectableChains,
  getStoredDfnsSelectedChainId,
  storeDfnsSelectedChainId
} from '@utils/wallet/dfnsConnector'
import { pickPreferredChainId } from '@utils/wallet/chains'

const DFNS_RETURN_PATH_KEY = 'dfns_return_path'

type DfnsConnect = (chainId?: number, code?: string) => Promise<void>

function getCurrentReturnPath() {
  if (typeof window === 'undefined') return undefined
  return `${window.location.pathname}${window.location.search}`
}

function storeReturnPath() {
  const returnPath = getCurrentReturnPath()
  if (!returnPath) return

  try {
    window.sessionStorage.setItem(DFNS_RETURN_PATH_KEY, returnPath)
  } catch {
    // Continue without restoring the original callback URL when storage fails.
  }
}

function popReturnPath() {
  if (typeof window === 'undefined') return undefined

  try {
    const returnPath = window.sessionStorage.getItem(DFNS_RETURN_PATH_KEY)
    window.sessionStorage.removeItem(DFNS_RETURN_PATH_KEY)
    return returnPath || undefined
  } catch {
    return undefined
  }
}

/**
 * Validate a stored return path and reduce it to a same-origin relative path
 * (`/pathname?search`). Rejects absolute/cross-origin URLs and `//host` forms
 * so the SSO callback can never be turned into an open redirect.
 */
function getSafeReturnPath(returnPath?: string) {
  if (!returnPath || typeof window === 'undefined') return undefined

  try {
    const returnUrl = new URL(returnPath, window.location.origin)
    if (returnUrl.origin !== window.location.origin) return undefined
    return `${returnUrl.pathname}${returnUrl.search}`
  } catch {
    return undefined
  }
}

function redirectToDfnsSso(ssoRedirectUrl: string) {
  const redirectUrl = new URL(ssoRedirectUrl)
  if (redirectUrl.protocol !== 'https:' && redirectUrl.protocol !== 'http:') {
    throw new Error('Dfns SSO returned an invalid redirect URL.')
  }

  window.location.assign(redirectUrl.toString())
}

/**
 * Shared DFNS connect flow, reusable from both the login setup panel and the
 * header reconnect modal. Owns the connect call, the SSO redirect kickoff, and
 * the registration-code prompt state. The pre-connect chain list is the
 * env-configured chains intersected with Ocean-validated chains (the actual
 * DFNS wallet list isn't known until after authenticating).
 */
export function useDfnsConnect() {
  const { connectAsync } = useConnect()
  const wagmiConfig = useConfig()
  const { user } = useAuth()
  const { validatedSupportedChains } = useMarketMetadata()

  const [isConnecting, setIsConnecting] = useState(false)
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false)
  const [registrationCode, setRegistrationCode] = useState('')
  const [pendingChainId, setPendingChainId] = useState<number | undefined>()

  const organizationId =
    user?.organizationId || getRuntimeConfig().NEXT_PUBLIC_DFNS_ORG_ID

  const dfnsChains = useMemo(() => {
    const allChains = getDfnsSelectableChains(wagmiConfig.chains)
    if (!validatedSupportedChains?.length) return allChains
    const validatedSet = new Set(validatedSupportedChains)
    const intersection = allChains.filter((chain) => validatedSet.has(chain.id))
    return intersection.length > 0 ? intersection : allChains
  }, [wagmiConfig.chains, validatedSupportedChains])

  const startSso = useCallback(async () => {
    storeReturnPath()
    // The org is resolved server-side from the authenticated session; no need
    // to send it from the client (it would be ignored / untrusted anyway).
    const response = await fetch('/api/dfns/initiate-sso', {
      method: 'POST',
      credentials: 'same-origin'
    })
    const data = (await response.json().catch(() => ({}))) as {
      ssoRedirectUrl?: string
      error?: string
    }

    if (!response.ok || !data.ssoRedirectUrl) {
      throw new Error(data.error || 'Failed to start Dfns SSO login.')
    }

    redirectToDfnsSso(data.ssoRedirectUrl)
  }, [])

  const connect = useCallback(
    async (chainId?: number, code?: string) => {
      setIsConnecting(true)
      try {
        if (chainId) storeDfnsSelectedChainId(chainId)

        await connectAsync({
          allowRegistrationCodePrompt: false,
          connector: dfnsConnector(),
          chainId,
          registrationCode: code,
          username: user?.email || user?.username,
          organizationId
        } as Parameters<typeof connectAsync>[0])
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.toLowerCase().includes('dfns sso login')
        ) {
          await startSso()
          return
        }

        if (
          error instanceof Error &&
          error.message === DFNS_REGISTRATION_CODE_REQUIRED_MESSAGE
        ) {
          setPendingChainId(chainId || getStoredDfnsSelectedChainId())
          setRegistrationCode('')
          setIsRegistrationModalOpen(true)
          return
        }

        toast.error(
          error instanceof Error ? error.message : 'Dfns wallet failed.'
        )
      } finally {
        setIsConnecting(false)
      }
    },
    [connectAsync, organizationId, startSso, user?.email, user?.username]
  )

  /**
   * Entry point for "connect DFNS": reuses a previously selected chain when it
   * is still valid, otherwise picks the default network (Sepolia → OP Sepolia →
   * first configured) without forcing a pre-connect network prompt.
   */
  const openConnect = useCallback(() => {
    const storedChainId = getStoredDfnsSelectedChainId()
    if (
      storedChainId &&
      dfnsChains.some((chain) => chain.id === storedChainId)
    ) {
      connect(storedChainId).catch((error) =>
        console.error('Dfns wallet setup failed:', error)
      )
      return
    }

    const preferredId = pickPreferredChainId(
      dfnsChains.map((chain) => chain.id)
    )
    connect(preferredId).catch((error) =>
      console.error('Dfns wallet setup failed:', error)
    )
  }, [connect, dfnsChains])

  const submitRegistrationCode = useCallback(() => {
    const code = registrationCode.trim()
    if (!code) return
    setIsRegistrationModalOpen(false)
    connect(pendingChainId || getStoredDfnsSelectedChainId(), code).catch(
      (error) => console.error('Dfns wallet setup failed:', error)
    )
  }, [connect, pendingChainId, registrationCode])

  return {
    connect,
    openConnect,
    dfnsChains,
    isConnecting,
    isRegistrationModalOpen,
    setIsRegistrationModalOpen,
    registrationCode,
    setRegistrationCode,
    submitRegistrationCode
  }
}

export function useDfnsSsoReturnHandler(connect: DfnsConnect) {
  const { isConnected } = useAccount()
  const router = useRouter()

  useEffect(() => {
    if (!router.isReady || router.query.dfns !== 'success' || isConnected) {
      return
    }

    // Return the user to the page that started the flow (validated same-origin).
    // The server callback always lands here on /auth/login; navigating to the
    // stored path restores a header-initiated reconnect to its origin page.
    // Falls back to stripping the `dfns` marker from the current route.
    const returnPath = getSafeReturnPath(popReturnPath())
    if (returnPath) {
      router.replace(returnPath)
    } else {
      const nextQuery = { ...router.query }
      delete nextQuery.dfns
      router.replace(
        { pathname: router.pathname, query: nextQuery },
        undefined,
        { shallow: true }
      )
    }

    connect(getStoredDfnsSelectedChainId()).catch((error) =>
      console.error('Dfns wallet setup failed:', error)
    )
  }, [router, isConnected, connect])

  useEffect(() => {
    if (!router.isReady) return
    const dfnsStatus = router.query.dfns
    if (
      dfnsStatus !== 'missing_auth_params' &&
      dfnsStatus !== 'sso_completion_failed'
    ) {
      return
    }

    toast.error('Dfns SSO login failed. Please try again.')
    const nextQuery = { ...router.query }
    delete nextQuery.dfns
    router.replace({ pathname: router.pathname, query: nextQuery }, undefined, {
      shallow: true
    })
  }, [router])
}

/**
 * Global handler for the DFNS SSO redirect return. Mounted once (in App) so the
 * `?dfns=success` callback resolves on whatever page initiated the connect —
 * login or a mid-session reconnect from the header.
 */
export function useDfnsSsoReturn() {
  const dfns = useDfnsConnect()
  useDfnsSsoReturnHandler(dfns.connect)

  return dfns
}
