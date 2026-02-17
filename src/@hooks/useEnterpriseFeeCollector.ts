import { useCallback, useEffect, useState } from 'react' // Import useCallback
import { EnterpriseFeeCollectorContract } from '@oceanprotocol/lib'
import { getOceanConfig } from '@utils/ocean'
import { useChainId } from 'wagmi'
import { formatUnits } from 'ethers'
import { getTokenInfo } from '@utils/wallet'
import { Fees } from 'src/@types/feeCollector/FeeCollector.type'
import { OpcFee } from '@context/MarketMetadata/_types'
import { useEthersSigner } from './useEthersSigner'

function useEnterpriseFeeCollector() {
  const chainId = useChainId()
  const signer = useEthersSigner()
  const [enterpriseFeeCollector, setEnterpriseFeeCollector] = useState<
    EnterpriseFeeCollectorContract | undefined
  >(undefined)

  const [fees, setFees] = useState<Fees[] | undefined>(undefined)

  // 1. Wrap fetchFees in useCallback
  const fetchFees = useCallback(
    async (
      enterpriseFeeColletor: EnterpriseFeeCollectorContract
    ): Promise<Fees[]> => {
      try {
        const config = getOceanConfig(chainId)
        const { tokenAddresses } = config

        if (!tokenAddresses || tokenAddresses.length === 0 || !signer) {
          return []
        }

        const feesPromises = tokenAddresses.map(
          async (tokenAddress: string) => {
            try {
              const isTokenApproved =
                await enterpriseFeeColletor.contract.isTokenAllowed(
                  tokenAddress
                )

              if (isTokenApproved) {
                const feesData = await enterpriseFeeColletor.contract.getToken(
                  tokenAddress
                )
                const tokenDetails = await getTokenInfo(
                  tokenAddress,
                  signer!.provider
                )

                return {
                  approved: feesData[0],
                  feePercentage: formatUnits(feesData[1], 18),
                  maxFee: formatUnits(feesData[2], tokenDetails.decimals),
                  minFee: formatUnits(feesData[3], tokenDetails.decimals),
                  tokenAddress
                } as Fees
              } else {
                return {
                  approved: false,
                  feePercentage: '0',
                  maxFee: '0',
                  minFee: '0',
                  tokenAddress
                } as Fees
              }
            } catch (innerError) {
              console.error(
                `Error fetching fees for token ${tokenAddress}:`,
                innerError
              )
              return {
                approved: false,
                feePercentage: '0',
                maxFee: '0',
                minFee: '0',
                tokenAddress
              } as Fees
            }
          }
        )

        const results = await Promise.all(feesPromises)
        return results
      } catch (error: any) {
        console.error('Error fetching fees:', error)
        return []
      }
    },
    [chainId, signer] // Dependencies for fetchFees
  )

  useEffect(() => {
    if (!signer || !chainId) return
    const config = getOceanConfig(chainId)
    if (!config || !config.EnterpriseFeeCollector) return

    try {
      setEnterpriseFeeCollector(
        new EnterpriseFeeCollectorContract(
          config.EnterpriseFeeCollector,
          signer,
          config.chainId
        )
      )
    } catch (error: any) {
      console.error('Error initializing EnterpriseFeeCollectorContract:', error)
    }
  }, [signer, chainId])

  useEffect(() => {
    if (!enterpriseFeeCollector) return
    const fetchData = async () => {
      const result = await fetchFees(enterpriseFeeCollector)
      setFees(result)
    }
    fetchData()
  }, [enterpriseFeeCollector, fetchFees]) // Added fetchFees to deps

  // 2. Wrap getOpcData in useCallback
  const getOpcData = useCallback(
    async (chainIds: number[]): Promise<OpcFee[]> => {
      if (!enterpriseFeeCollector) return []
      const validChainIds = chainIds.filter((chainId) => {
        const config = getOceanConfig(chainId)
        return !!config?.routerFactoryAddress
      })
      const opcData: OpcFee[] = await Promise.all(
        validChainIds.map(async (cId) => {
          // Note: This uses current signer context
          const currentFeesArray = await fetchFees(enterpriseFeeCollector)

          return {
            chainId: cId,
            tokensData: currentFeesArray.map((fee) => ({
              tokenAddress: fee.tokenAddress,
              feePercentage: fee.feePercentage,
              maxFee: fee.maxFee,
              minFee: fee.minFee,
              approved: fee.approved
            }))
          }
        })
      )
      return opcData
    },
    [enterpriseFeeCollector, fetchFees] // Dependencies for getOpcData
  )

  return { fees, signer, getOpcData, enterpriseFeeCollector }
}

export default useEnterpriseFeeCollector
