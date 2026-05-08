import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAccount } from 'wagmi'
import appConfig from 'app.config.cjs'
import { useSsiWallet } from '@context/SsiWallet'
import { useEthersSigner } from './useEthersSigner'
import useSsiAllowedChain from './useSsiAllowedChain'
import { useUserPreferences } from '@context/UserPreferences'
import { useAuth } from './useAuth'

export default function useSsiAutoConnectPrompt(): void {
  const router = useRouter()
  const { isConnected } = useAccount()
  const { isSsiChainAllowed, isSsiChainReady } = useSsiAllowedChain()
  const walletClient = useEthersSigner()
  const { setShowSsiWalletModule } = useUserPreferences()
  const { isAuthenticated, authEnabled } = useAuth()
  const {
    sessionToken,
    isSsiStateHydrated,
    tryAcquireSsiAutoConnectLock,
    resetSsiAutoConnectLock
  } = useSsiWallet()

  useEffect(() => {
    if (!appConfig.ssiEnabled) return
    if (!isSsiStateHydrated) return

    const isAuthRoute = router.asPath.split('?')[0].startsWith('/auth/')
    if (isAuthRoute) {
      resetSsiAutoConnectLock()
      setShowSsiWalletModule(false)
      return
    }

    if (!isConnected || !isSsiChainReady || !isSsiChainAllowed) {
      resetSsiAutoConnectLock()
      setShowSsiWalletModule(false)
      return
    }

    if (authEnabled && !isAuthenticated) {
      resetSsiAutoConnectLock()
      setShowSsiWalletModule(false)
      return
    }

    if (!walletClient || sessionToken) return
    if (!tryAcquireSsiAutoConnectLock()) return

    setShowSsiWalletModule(true)
  }, [
    isConnected,
    isAuthenticated,
    authEnabled,
    isSsiChainAllowed,
    isSsiChainReady,
    walletClient,
    sessionToken,
    isSsiStateHydrated,
    router.asPath,
    tryAcquireSsiAutoConnectLock,
    resetSsiAutoConnectLock,
    setShowSsiWalletModule
  ])
}
