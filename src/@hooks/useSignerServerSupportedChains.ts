import { useEffect, useMemo, useState } from 'react'
import { getSignerServerNetworks } from '@utils/wallet/signerServerApi'
import { isSignerServerConfigured } from '@utils/wallet/signerServerConnector'

export function useSignerServerSupportedChains(chainIds: number[]): number[] {
  const [signerServerChainIds, setSignerServerChainIds] = useState<number[]>()
  const shouldFilterBySignerServer = isSignerServerConfigured()

  useEffect(() => {
    if (!shouldFilterBySignerServer) {
      setSignerServerChainIds(undefined)
      return
    }

    let cancelled = false

    getSignerServerNetworks()
      .then((networks) => {
        if (cancelled) return
        setSignerServerChainIds(
          networks
            .map((network) => network.chainId)
            .filter((chainId) => Number.isInteger(chainId) && chainId > 0)
        )
      })
      .catch((error) => {
        if (cancelled) return
        console.error('Failed to load signer server networks:', error)
        setSignerServerChainIds([])
      })

    return () => {
      cancelled = true
    }
  }, [shouldFilterBySignerServer])

  return useMemo(() => {
    if (!shouldFilterBySignerServer) return chainIds
    if (!signerServerChainIds) return []

    const signerChainIdSet = new Set(signerServerChainIds)
    return chainIds.filter((chainId) => signerChainIdSet.has(chainId))
  }, [chainIds, shouldFilterBySignerServer, signerServerChainIds])
}
