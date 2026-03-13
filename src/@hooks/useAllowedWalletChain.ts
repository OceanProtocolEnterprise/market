import { useMemo } from 'react'
import appConfig from 'app.config.cjs'
import { getAllowedErc20ChainIds } from '@utils/runtimeConfig'
import useActiveWalletChainId from './useActiveWalletChainId'

export default function useAllowedWalletChain() {
  const chainId = useActiveWalletChainId()

  const allowedChainIds = useMemo(
    () => getAllowedErc20ChainIds(appConfig.chainIdsSupported),
    []
  )

  const isAllowedChain = chainId ? allowedChainIds.includes(chainId) : false

  return {
    chainId,
    isAllowedChain
  }
}
