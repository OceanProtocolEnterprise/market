'use client'
import { useMemo } from 'react'
import { getAddress } from 'ethers'
/**
 * Returns a checksummed array of allowed token addresses for a given network.
 * Falls back to OCEAN token if no env addresses are found.
 * @param networkId Chain ID or network name
 */
export default function useAllowedTokenAddresses(
  networkId?: string | number
): string[] {
  return useMemo(() => {
    if (!networkId) return []
    const erc20Map: Record<string, string[]> = process.env
      .NEXT_PUBLIC_ALLOWED_ERC20_ADDRESSES
      ? JSON.parse(process.env.NEXT_PUBLIC_ALLOWED_ERC20_ADDRESSES)
      : {}

    const networkKey = networkId.toString()
    let addresses: string[] = []

    if (erc20Map[networkKey] && erc20Map[networkKey].length > 0) {
      addresses = erc20Map[networkKey].reduce((acc: string[], address) => {
        try {
          acc.push(getAddress(address))
        } catch (e) {
          console.warn(
            `[useAllowedTokenAddresses] Invalid address skipped: ${address}`
          )
        }
        return acc
      }, [])
    }

    return addresses
  }, [networkId])
}
