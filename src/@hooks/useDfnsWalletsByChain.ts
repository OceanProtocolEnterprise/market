import { useMemo, useSyncExternalStore } from 'react'
import { useAccount } from 'wagmi'
import { useMarketMetadata } from '@context/MarketMetadata'
import {
  DFNS_CONNECTOR_ID,
  getActiveDfnsWalletsByChain,
  subscribeToActiveDfnsWalletsByChain
} from '@utils/wallet/dfnsConnector'
import { SIGNER_SERVER_CONNECTOR_ID } from '@utils/wallet/signerServerConnector'
import {
  getActiveSignerServerEoaSigner,
  subscribeToActiveSignerServerEoaSigner
} from '@utils/wallet/signerServerEoaSigner'

export const DFNS_WALLET_NOT_CONNECTED_REASON = 'DFNS wallet is not connected.'
export const DFNS_WALLET_UNAVAILABLE_REASON =
  'No DFNS wallet provisioned on this network.'
export const SIGNER_SERVER_NOT_CONNECTED_REASON =
  'Signer server wallet is not connected.'
export const SIGNER_SERVER_UNAVAILABLE_REASON =
  'Signer server does not support this network.'

/**
 * Returns the `chainId -> walletId` map for the active DFNS connector,
 * or `undefined` when no DFNS connector is active. Subscribes via
 * useSyncExternalStore so consumers re-render when the connector connects /
 * disconnects.
 */
export function useDfnsWalletsByChain():
  | ReadonlyMap<number, string>
  | undefined {
  return useSyncExternalStore(
    subscribeToActiveDfnsWalletsByChain,
    getActiveDfnsWalletsByChain,
    () => undefined
  )
}

export function useSignerServerChainIds(): number[] | undefined {
  const signer = useSyncExternalStore(
    subscribeToActiveSignerServerEoaSigner,
    getActiveSignerServerEoaSigner,
    () => undefined
  )

  return useMemo(() => signer?.getSupportedChainIds(), [signer])
}

export type ChainSupportStatus = {
  isSupported: boolean
  isDfns: boolean
  isSignerServer: boolean
  reason?: string
}

/**
 * Reports whether `chainId` is reachable for the active wallet connection.
 *
 * - For DFNS: requires both the chain to be in the wallets-by-chain map and
 *   the user to be connected. Otherwise reports the reason so callers can
 *   render a tooltip or disabled state.
 * - For other connectors (MetaMask / injected): trusts the wagmi config;
 *   any chain in `config.chains` is switchable.
 */
export function useIsChainSupportedByConnector(
  chainId: number | undefined
): ChainSupportStatus {
  const { connector } = useAccount()
  const dfnsMap = useDfnsWalletsByChain()
  const signerServerChainIds = useSignerServerChainIds()
  const isDfns = connector?.id === DFNS_CONNECTOR_ID
  const isSignerServer = connector?.id === SIGNER_SERVER_CONNECTOR_ID

  if (!chainId) {
    return {
      isSupported: false,
      isDfns,
      isSignerServer,
      reason: 'Missing chain id.'
    }
  }

  if (!isDfns && !isSignerServer) {
    return { isSupported: true, isDfns: false, isSignerServer: false }
  }

  if (isDfns && !dfnsMap) {
    return {
      isSupported: false,
      isDfns: true,
      isSignerServer: false,
      reason: DFNS_WALLET_NOT_CONNECTED_REASON
    }
  }

  if (isDfns && !dfnsMap.has(chainId)) {
    return {
      isSupported: false,
      isDfns: true,
      isSignerServer: false,
      reason: DFNS_WALLET_UNAVAILABLE_REASON
    }
  }

  if (isSignerServer && !signerServerChainIds) {
    return {
      isSupported: false,
      isDfns: false,
      isSignerServer: true,
      reason: SIGNER_SERVER_NOT_CONNECTED_REASON
    }
  }

  if (isSignerServer && !signerServerChainIds.includes(chainId)) {
    return {
      isSupported: false,
      isDfns: false,
      isSignerServer: true,
      reason: SIGNER_SERVER_UNAVAILABLE_REASON
    }
  }

  return { isSupported: true, isDfns, isSignerServer }
}

/**
 * Central selector for the networks a user can actually switch to, given the
 * active wallet connection. This is the single source of truth consumed by all
 * network-picker surfaces (header switcher, NetworkWarningModal):
 *
 *   - MetaMask / injected: the full Ocean-validated chain list.
 *   - DFNS: Ocean-validated chains intersected with the chains the user has a
 *     DFNS wallet provisioned on. Chains without a DFNS wallet are dropped
 *     entirely (not shown disabled).
 *
 * The Ocean-validated list (`validatedSupportedChains`) is intentionally left
 * untouched in context. It is still the source for non-UI logic such as the
 * "current chain supported" check and OPC fee fetching, which must see every
 * Ocean chain regardless of wallet provisioning.
 */
export function useConnectorSupportedChains(): number[] {
  const { validatedSupportedChains } = useMarketMetadata()
  const { connector } = useAccount()
  const dfnsMap = useDfnsWalletsByChain()
  const signerServerChainIds = useSignerServerChainIds()
  const isDfns = connector?.id === DFNS_CONNECTOR_ID
  const isSignerServer = connector?.id === SIGNER_SERVER_CONNECTOR_ID

  return useMemo(() => {
    if (isDfns) {
      if (!dfnsMap) return []
      return validatedSupportedChains.filter((chainId) => dfnsMap.has(chainId))
    }

    if (isSignerServer) {
      if (!signerServerChainIds) return []
      const signerServerChainIdSet = new Set(signerServerChainIds)
      return validatedSupportedChains.filter((chainId) =>
        signerServerChainIdSet.has(chainId)
      )
    }

    return validatedSupportedChains
  }, [
    isDfns,
    isSignerServer,
    dfnsMap,
    signerServerChainIds,
    validatedSupportedChains
  ])
}
