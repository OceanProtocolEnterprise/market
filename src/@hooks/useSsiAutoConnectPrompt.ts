import { useEffect } from 'react'
import { useAccount } from 'wagmi'
import appConfig from 'app.config.cjs'
import { useSsiWallet } from '@context/SsiWallet'
import { useEthersSigner } from './useEthersSigner'
import useSsiAllowedChain from './useSsiAllowedChain'
import { useUserPreferences } from '@context/UserPreferences'

export default function useSsiAutoConnectPrompt(): void {
  const { isConnected } = useAccount()
  const { isSsiChainAllowed, isSsiChainReady } = useSsiAllowedChain()
  const walletClient = useEthersSigner()
  const { setShowSsiWalletModule } = useUserPreferences()
  const {
    sessionToken,
    isSsiStateHydrated,
    tryAcquireSsiAutoConnectLock,
    resetSsiAutoConnectLock
  } = useSsiWallet()

  useEffect(() => {
    if (!appConfig.ssiEnabled) return
    if (!isSsiStateHydrated) return

    if (!isConnected || !isSsiChainReady || !isSsiChainAllowed) {
      resetSsiAutoConnectLock()
      setShowSsiWalletModule(false)
      return
    }

    if (!walletClient || sessionToken) return
    if (!tryAcquireSsiAutoConnectLock()) return

    setShowSsiWalletModule(true)
  }, [
    isConnected,
    isSsiChainAllowed,
    isSsiChainReady,
    walletClient,
    sessionToken,
    isSsiStateHydrated,
    tryAcquireSsiAutoConnectLock,
    resetSsiAutoConnectLock,
    setShowSsiWalletModule
  ])
}
