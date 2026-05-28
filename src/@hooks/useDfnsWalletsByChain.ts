import { useSyncExternalStore } from 'react'
import { useAccount } from 'wagmi'
import {
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
  /** Present when not supported — short, user-facing explanation. */
  reason?: string
}

/**
 * Reports whether `chainId` is reachable for the active wallet connection.
 *
 * - For DFNS: requires both the chain to be in the wallets-by-chain map and
 *   the user to be connected. Otherwise reports the reason so callers can
 *   render a tooltip or disabled state.
 * - For other connectors (MetaMask / injected): trusts the wagmi config —
 *   any chain in `config.chains` is switchable.
 */
export function useIsChainSupportedByConnector(
  chainId: number | undefined
): ChainSupportStatus {
  const { connector } = useAccount()
  const dfnsMap = useDfnsWalletsByChain()
  const isDfns = connector?.id === 'dfns'

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
