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
import { getTokenInfo } from '@utils/wallet'
import useEnterpriseFeeColletor from '@hooks/useEnterpriseFeeCollector'
import { useEthersSigner } from '@hooks/useEthersSigner'
import useAllowedTokenAddresses from '@hooks/useAllowedTokenAddresses'

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
  const envAllowedAddresses = useAllowedTokenAddresses(chainId)

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

  useEffect(() => {
    async function fetchTokenInfoSafe() {
      try {
        if (isLoading) return
        if (!chainId || !signer) return
        if (!enterpriseFeeCollector) return

        if (!envAllowedAddresses || envAllowedAddresses.length === 0) {
          setApprovedBaseTokens([])
          return
        }

        const allowanceChecks = await Promise.all(
          envAllowedAddresses.map(async (address) => {
            try {
              const isAllowed =
                await enterpriseFeeCollector.contract.isTokenAllowed(address)
              return isAllowed ? address : null
            } catch {
              return null
            }
          })
        )
        const contractAllowedAddresses = allowanceChecks.filter(
          (a): a is string => Boolean(a)
        )

        if (contractAllowedAddresses.length === 0) {
          setApprovedBaseTokens([])
          return
        }
        const tokenDetails = await Promise.all(
          contractAllowedAddresses.map((address) =>
            getTokenInfo(address, signer.provider)
          )
        )
        const validTokens = tokenDetails.filter(Boolean)

        setApprovedBaseTokens(validTokens)
      } catch (error: any) {
        console.error(
          '[fetchTokenInfoSafe] Error fetching approved token info:',
          error.message
        )
      }
    }

    fetchTokenInfoSafe()
  }, [isLoading, chainId, signer, enterpriseFeeCollector, envAllowedAddresses])

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

export { useMarketMetadata }
export default MarketMetadataProvider
