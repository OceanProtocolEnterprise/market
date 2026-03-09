import { useEffect, useState } from 'react'
import { LoggerInstance } from '@oceanprotocol/lib'
import { Contract, getAddress, JsonRpcProvider } from 'ethers'
import { getAllowedErc20Map } from '@utils/runtimeConfig'
import { getOceanConfig } from '@utils/ocean'
import appConfig from '../../app.config.cjs'

const ENTERPRISE_FEE_COLLECTOR_ABI = [
  'function isTokenAllowed(address) view returns (bool)'
]
const TOKEN_CHECK_TIMEOUT_MS = 5000

type AllowedChainTokens = {
  chainId: number
  tokenAddresses: string[]
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  context: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`${context} timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    promise
      .then((value) => {
        clearTimeout(timeout)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timeout)
        reject(error)
      })
  })
}

function getConfiguredAllowedChainTokens(): AllowedChainTokens[] {
  const allowedMap = getAllowedErc20Map()

  return Object.entries(allowedMap)
    .map(([chainIdRaw, tokenAddresses]) => {
      const chainId = Number(chainIdRaw)
      if (!Number.isFinite(chainId)) return null

      const validAddresses = tokenAddresses.reduce(
        (acc: string[], tokenAddress) => {
          try {
            acc.push(getAddress(tokenAddress))
          } catch {
            LoggerInstance.warn(
              `[useValidatedSupportedChains] Invalid token address "${tokenAddress}" ignored for chain ${chainId}.`
            )
          }
          return acc
        },
        []
      )

      if (!validAddresses.length) return null

      return {
        chainId,
        tokenAddresses: validAddresses
      } as AllowedChainTokens
    })
    .filter((entry): entry is AllowedChainTokens => Boolean(entry))
}

async function isTokenApprovedOnChain(
  contract: Contract,
  tokenAddress: string
): Promise<boolean> {
  try {
    return await withTimeout(
      contract.isTokenAllowed(tokenAddress),
      TOKEN_CHECK_TIMEOUT_MS,
      `isTokenAllowed(${tokenAddress})`
    )
  } catch (error) {
    LoggerInstance.warn(error)
    return false
  }
}

export async function fetchValidatedSupportedChains(): Promise<number[]> {
  const supportedChainIds = new Set(appConfig.chainIdsSupported)
  const configuredChains = getConfiguredAllowedChainTokens().filter(
    ({ chainId }) => supportedChainIds.has(chainId)
  )
  if (!configuredChains.length) return []

  const chainResults = await Promise.all(
    configuredChains.map(async ({ chainId, tokenAddresses }) => {
      const config = getOceanConfig(chainId)
      const feeCollectorAddress = config?.EnterpriseFeeCollector
      const nodeUri = config?.nodeUri

      if (!feeCollectorAddress || !nodeUri) {
        return null
      }

      try {
        const provider = new JsonRpcProvider(nodeUri)
        const contract = new Contract(
          feeCollectorAddress,
          ENTERPRISE_FEE_COLLECTOR_ABI,
          provider
        )

        const checks = await Promise.allSettled(
          tokenAddresses.map((tokenAddress) =>
            isTokenApprovedOnChain(contract, tokenAddress)
          )
        )

        const hasApprovedToken = checks.some(
          (result) => result.status === 'fulfilled' && result.value
        )

        return hasApprovedToken ? chainId : null
      } catch (error) {
        LoggerInstance.warn(
          `[useValidatedSupportedChains] Failed to validate chain ${chainId}.`,
          error
        )
        return null
      }
    })
  )

  return chainResults
    .filter((chainId): chainId is number => Number.isFinite(chainId))
    .sort((a, b) => a - b)
}

export default function useValidatedSupportedChains() {
  const [validatedSupportedChains, setValidatedSupportedChains] = useState<
    number[]
  >([])
  const [isValidatingSupportedChains, setIsValidatingSupportedChains] =
    useState<boolean>(true)
  const [supportedChainsValidationError, setSupportedChainsValidationError] =
    useState<string>()

  useEffect(() => {
    let cancelled = false

    async function validateChains() {
      setIsValidatingSupportedChains(true)
      setSupportedChainsValidationError(undefined)

      try {
        const chainIds = await fetchValidatedSupportedChains()
        if (!cancelled) {
          setValidatedSupportedChains(chainIds)
        }
      } catch (error) {
        LoggerInstance.error(error)
        if (!cancelled) {
          setValidatedSupportedChains([])
          setSupportedChainsValidationError(
            error instanceof Error ? error.message : 'Chain validation failed'
          )
        }
      } finally {
        if (!cancelled) {
          setIsValidatingSupportedChains(false)
        }
      }
    }

    validateChains()

    return () => {
      cancelled = true
    }
  }, [])

  return {
    validatedSupportedChains,
    isValidatingSupportedChains,
    supportedChainsValidationError
  }
}
