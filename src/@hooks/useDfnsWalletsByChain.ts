import { useMemo, useSyncExternalStore } from 'react'
import { useAccount } from 'wagmi'
import { useMarketMetadata } from '@context/MarketMetadata'
import {
  DFNS_CONNECTOR_ID,
  getActiveDfnsWalletsByChain,
  subscribeToActiveDfnsWalletsByChain
} from '@utils/wallet/dfnsConnector'

export const DFNS_WALLET_NOT_CONNECTED_REASON = 'DFNS wallet is not connected.'
export const DFNS_WALLET_UNAVAILABLE_REASON =
  'No DFNS wallet provisioned on this network.'

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

export type ChainSupportStatus = {
  isSupported: boolean
  isDfns: boolean
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
  const isDfns = connector?.id === DFNS_CONNECTOR_ID

  if (!chainId) {
    return { isSupported: false, isDfns, reason: 'Missing chain id.' }
  }

  if (!isDfns) {
    return { isSupported: true, isDfns: false }
  }

  if (!dfnsMap) {
    return {
      isSupported: false,
      isDfns: true,
      reason: DFNS_WALLET_NOT_CONNECTED_REASON
    }
  }

  if (!dfnsMap.has(chainId)) {
    return {
      isSupported: false,
      isDfns: true,
      reason: DFNS_WALLET_UNAVAILABLE_REASON
    }
  }

  return { isSupported: true, isDfns: true }
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
  const isDfns = connector?.id === DFNS_CONNECTOR_ID

  return useMemo(() => {
    if (!isDfns) return validatedSupportedChains
    if (!dfnsMap) return []
    return validatedSupportedChains.filter((chainId) => dfnsMap.has(chainId))
  }, [isDfns, dfnsMap, validatedSupportedChains])
}
