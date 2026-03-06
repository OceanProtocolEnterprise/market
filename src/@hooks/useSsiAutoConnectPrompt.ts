import { useEffect } from 'react'
import { useAccount } from 'wagmi'
import appConfig from 'app.config.cjs'
import { useSsiWallet } from '@context/SsiWallet'
import { useEthersSigner } from './useEthersSigner'
import useAllowedWalletChain from './useAllowedWalletChain'
import { useUserPreferences } from '@context/UserPreferences'

export default function useSsiAutoConnectPrompt(): void {
  const { isConnected } = useAccount()
  const { isAllowedChain } = useAllowedWalletChain()
  const walletClient = useEthersSigner()
  const { setShowSsiWalletModule } = useUserPreferences()
  const {
    sessionToken,
    tryAcquireSsiAutoConnectLock,
    resetSsiAutoConnectLock
  } = useSsiWallet()

  useEffect(() => {
    if (!appConfig.ssiEnabled) return

    if (!isConnected || !isAllowedChain) {
      resetSsiAutoConnectLock()
      setShowSsiWalletModule(false)
      return
    }

    if (!walletClient || sessionToken) return
    if (!tryAcquireSsiAutoConnectLock()) return

    setShowSsiWalletModule(true)
  }, [
    isConnected,
    isAllowedChain,
    walletClient,
    sessionToken,
    tryAcquireSsiAutoConnectLock,
    resetSsiAutoConnectLock,
    setShowSsiWalletModule
  ])
}
