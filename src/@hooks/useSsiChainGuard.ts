import { useCallback } from 'react'
import { LoggerInstance } from '@oceanprotocol/lib'
import { toast } from 'react-toastify'
import useSsiAllowedChain from './useSsiAllowedChain'
import useNetworkMetadata from './useNetworkMetadata'

export default function useSsiChainGuard() {
  const { chainId, isSsiChainAllowed, isSsiChainReady } = useSsiAllowedChain()
  const { networkDisplayName } = useNetworkMetadata(chainId)

  const getUnsupportedChainMessage = useCallback(() => {
    const networkName =
      networkDisplayName || (chainId ? `Chain ID ${chainId}` : 'Unknown')
    return `Blockchain ${networkName} not supported. SSI signature cannot be initiated on this network.`
  }, [networkDisplayName, chainId])

  const ensureAllowedChainForSsi = useCallback((): boolean => {
    if (!isSsiChainReady) {
      toast.info('Checking network support. Please try again in a moment.')
      return false
    }

    if (isSsiChainAllowed) return true

    const message = getUnsupportedChainMessage()
    LoggerInstance.error(message)
    toast.error(message)
    return false
  }, [isSsiChainAllowed, isSsiChainReady, getUnsupportedChainMessage])

  return {
    isAllowedChain: isSsiChainAllowed,
    ensureAllowedChainForSsi
  }
}
