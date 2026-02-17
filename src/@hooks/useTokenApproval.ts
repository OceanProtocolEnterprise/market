import { useEffect, useState, useCallback } from 'react'
import { EnterpriseFeeCollectorContract } from '@oceanprotocol/lib'

/**
 * Hook to check which token addresses are allowed in an EnterpriseFeeCollector
 * @param enterpriseFeeCollector - The initialized contract instance
 * @param tokenAddresses - List of token addresses to check
 */
function useTokenApproval(
  enterpriseFeeCollector: EnterpriseFeeCollectorContract | undefined,
  tokenAddresses: string[] | undefined
) {
  const [allowedTokens, setAllowedTokens] = useState<string[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchAllowedTokens = useCallback(async () => {
    if (!enterpriseFeeCollector || !tokenAddresses?.length) {
      setAllowedTokens([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const results = await Promise.all(
        tokenAddresses.map(async (tokenAddress) => {
          try {
            const isAllowed =
              await enterpriseFeeCollector.contract.isTokenAllowed(tokenAddress)
            return isAllowed ? tokenAddress : null
          } catch (innerError) {
            console.warn(
              `[useTokenApproval] Error checking token ${tokenAddress}:`,
              innerError
            )
            return null
          }
        })
      )

      setAllowedTokens(results.filter(Boolean) as string[])
    } catch (err: any) {
      console.error('[useTokenApproval] Failed to fetch allowed tokens:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [enterpriseFeeCollector, tokenAddresses])

  useEffect(() => {
    const fetch = async () => {
      await fetchAllowedTokens()
    }
    fetch()
  }, [fetchAllowedTokens])

  return { allowedTokens, loading, error, refetch: fetchAllowedTokens }
}

export default useTokenApproval
