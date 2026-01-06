import {
  createContext,
  ReactElement,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react'
import { MarketMetadataProviderValue, OpcFee } from './_types'
import siteContent from '../../../content/site.json'
import appConfig from '../../../app.config.cjs'
import { useConnect, useChainId } from 'wagmi'
import { getOceanConfig } from '@utils/ocean'
import { getTokenInfo } from '@utils/wallet'
import useEnterpriseFeeColletor from '@hooks/useEnterpriseFeeCollector'
import { useEthersSigner } from '@hooks/useEthersSigner'

const MarketMetadataContext = createContext({} as MarketMetadataProviderValue)

function MarketMetadataProvider({
  children
}: {
  children: ReactNode
}): ReactElement {
  const { status } = useConnect()
  const isLoading = status === 'pending'
  const chainId = useChainId()
  const signer = useEthersSigner()

  const { getOpcData, enterpriseFeeCollector } = useEnterpriseFeeColletor()
  const [opcFees, setOpcFees] = useState<OpcFee[]>()
  const [approvedBaseTokens, setApprovedBaseTokens] = useState<TokenInfo[]>()

  const config = getOceanConfig(chainId)

  // ---------------------------
  // Load OPC Fee Data
  // ---------------------------
  useEffect(() => {
    async function fetchData() {
      // Safety check: Don't run if we don't have a signer yet
      if (!signer) return

      const opcData = await getOpcData(appConfig.chainIdsSupported)
      setOpcFees(opcData)
    }

    if (!opcFees && signer && enterpriseFeeCollector) {
      fetchData()
    }
  }, [signer, getOpcData, enterpriseFeeCollector])

  // ---------------------------
  // Get OPC fee for given token
  // ---------------------------
  const getOpcFeeForToken = useCallback(
    (tokenAddress: string, chainId: number): string => {
      if (!opcFees) return '0'
      const opc = opcFees.find((x) => x.chainId === chainId)
      return (
        opc?.tokensData.find(
          (x) => x.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()
        )?.feePercentage || '0'
      )
    },
    [opcFees]
  )

  // ---------------------------
  // Load approved tokens metadata
  // ---------------------------

  const tokenAddressesString = JSON.stringify(config?.tokenAddresses || [])

  useEffect(() => {
    async function fetchTokenInfoSafe() {
      const addresses = JSON.parse(tokenAddressesString)

      try {
        if (isLoading) return

        if (!addresses || addresses.length === 0) {
          return
        }

        if (!chainId) return
        if (!signer) return

        // 1. Fetch metadata for all configured tokens
        const tokenPromises = addresses.map((address: string) =>
          getTokenInfo(address, signer.provider)
        )

        const tokensDetails = await Promise.all(tokenPromises)
        // 2. Identify allowed tokens from OPC Data for the current chain
        const currentChainOpc = opcFees?.find((x) => x.chainId === chainId)

        // Create a Set of allowed addresses (normalized to lowercase) for fast lookup
        const allowedAddresses = new Set(
          currentChainOpc?.tokensData.map((t) =>
            t.tokenAddress.toLowerCase()
          ) || []
        )
        // 3. Filter: Keep only valid tokens that ARE ALSO in the allowed list
        const filteredTokens = tokensDetails.filter((t) => {
          if (!t) return false // Filter out undefined fetch results

          return allowedAddresses.has(t.address.toLowerCase())
        })

        setApprovedBaseTokens(filteredTokens)
      } catch (error: any) {
        console.error(
          '[fetchTokenInfo] Error fetching token info:',
          error.message
        )
      }
    }

    // added opcFees to dependency so it refilters when fee data arrives
    fetchTokenInfoSafe()
  }, [isLoading, chainId, signer, tokenAddressesString, opcFees])

  return (
    <MarketMetadataContext.Provider
      value={
        {
          opcFees,
          siteContent,
          appConfig,
          getOpcFeeForToken,
          approvedBaseTokens
        } as MarketMetadataProviderValue
      }
    >
      {children}
    </MarketMetadataContext.Provider>
  )
}

const useMarketMetadata = (): MarketMetadataProviderValue =>
  useContext(MarketMetadataContext)

export { MarketMetadataProvider, useMarketMetadata, MarketMetadataContext }
export default MarketMetadataProvider
