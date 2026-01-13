'use client'
import { useMemo } from 'react'
import { getAddress } from 'ethers'
import { getOceanConfig } from '@utils/ocean'
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

    const oceanConfig = getOceanConfig(networkId)
    const tokenAddresses = oceanConfig?.tokenAddresses || []

    if (!Array.isArray(tokenAddresses) || tokenAddresses.length === 0) {
      return []
    }

    return tokenAddresses.reduce((acc: string[], address: string) => {
      try {
        acc.push(getAddress(address)) // checksum + validate
      } catch (e) {
        console.warn(
          `[useAllowedTokenAddresses] Invalid address skipped: ${address}`
        )
      }
      return acc
    }, [])
  }, [networkId])
}
