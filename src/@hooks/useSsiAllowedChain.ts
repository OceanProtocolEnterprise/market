import { useMarketMetadata } from '@context/MarketMetadata'
import useActiveWalletChainId from './useActiveWalletChainId'

export default function useSsiAllowedChain() {
  const chainId = useActiveWalletChainId()
  const { validatedSupportedChains, isValidatingSupportedChains } =
    useMarketMetadata()

  const isSsiChainAllowed = Boolean(
    chainId && validatedSupportedChains.includes(chainId)
  )

  return {
    chainId,
    isSsiChainAllowed,
    isSsiChainReady: !isValidatingSupportedChains
  }
}
