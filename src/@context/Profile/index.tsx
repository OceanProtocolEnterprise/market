import {
  useContext,
  useState,
  useEffect,
  createContext,
  ReactElement,
  useCallback,
  ReactNode,
  useRef,
  useMemo
} from 'react'
import { useUserPreferences } from '../UserPreferences'
import { EscrowContract, LoggerInstance } from '@oceanprotocol/lib'
import {
  getDownloadAssets,
  getPublishedAssets,
  getUserOrders,
  getUserSalesAndRevenue
} from '@utils/aquarius'
import axios, { CancelToken } from 'axios'
import { useMarketMetadata } from '../MarketMetadata'
import { formatUnits, isAddress, Signer } from 'ethers'
import { Asset } from 'src/@types/Asset'
import { useChainId } from 'wagmi'
import { getOceanConfig } from '@utils/ocean'
import { getTokenInfo } from '@utils/wallet'
import { useEthersSigner } from '@hooks/useEthersSigner'
import { useCancelToken } from '@hooks/useCancelToken'
import { getComputeEnvironments } from '@utils/provider'

interface EscrowFunds {
  available: string
  locked: string
  symbol: string
  address: string
  decimals: number
}

interface ProfileProviderValue {
  assets: Asset[]
  assetsTotal: number
  isEthAddress: boolean
  downloads: DownloadedAsset[]
  downloadsTotal: number
  isDownloadsLoading: boolean
  sales: number
  ownAccount: boolean
  revenue: { [symbol: string]: number }
  escrowFundsByToken: { [symbol: string]: EscrowFunds }
  handlePageChange: (pageNumber: number) => void
  refreshEscrowFunds?: () => void
}

const ProfileContext = createContext({} as ProfileProviderValue)

function ProfileProvider({
  accountId,
  ownAccount,
  children
}: {
  accountId: string
  ownAccount: boolean
  children: ReactNode
}): ReactElement {
  const walletClient = useEthersSigner() // FIX: Replaced useSigner
  const chainId = useChainId() // FIX: Replaced useNetwork
  const { chainIds } = useUserPreferences()
  const { appConfig, approvedBaseTokens, validatedSupportedChains } =
    useMarketMetadata()
  const [revenue, setRevenue] = useState<{ [symbol: string]: number }>({})
  const [escrowFundsByToken, setEscrowFundsByToken] = useState<{
    [symbol: string]: EscrowFunds
  }>({})
  const tokenInfoCache = useRef<Map<string, TokenInfo>>(new Map())
  const newCancelToken = useCancelToken()

  const [isEthAddress, setIsEthAddress] = useState<boolean>()
  //
  // Do nothing in all following effects
  // when accountId is no ETH address
  //
  useEffect(() => {
    const isEthAddress = isAddress(accountId)
    setIsEthAddress(isEthAddress)
  }, [accountId])

  //
  // PUBLISHED ASSETS
  //
  const [assets, setAssets] = useState<Asset[]>()
  const [assetsTotal, setAssetsTotal] = useState(0)
  // const [assetsWithPrices, setAssetsWithPrices] = useState<AssetListPrices[]>()

  useEffect(() => {
    if (!accountId || !isEthAddress) return

    const cancelTokenSource = axios.CancelToken.source()

    async function getAllPublished() {
      try {
        const result = await getPublishedAssets(
          accountId,
          chainIds,
          cancelTokenSource.token,
          ownAccount,
          ownAccount
        )
        setAssets(result?.results)
        setAssetsTotal(result?.totalResults)

        // Hint: this would only make sense if we "search" in all subcomponents
        // against this provider's state, meaning filtering via js rather then sending
        // more queries to Aquarius.
        // const assetsWithPrices = await getAssetsBestPrices(result.results)
        // setAssetsWithPrices(assetsWithPrices)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        LoggerInstance.error(errorMessage)
      }
    }
    getAllPublished()

    return () => {
      cancelTokenSource.cancel()
    }
  }, [
    accountId,
    appConfig.metadataCacheUri,
    chainIds,
    isEthAddress,
    ownAccount
  ])

  //
  // DOWNLOADS
  //
  const [downloads, setDownloads] = useState<DownloadedAsset[]>()
  const [downloadsTotal, setDownloadsTotal] = useState(0)
  const [isDownloadsLoading, setIsDownloadsLoading] = useState<boolean>()
  const [currentPage, setCurrentPage] = useState(1)

  const fetchDownloads = useCallback(
    async (cancelToken: CancelToken, page = 1) => {
      if (!accountId || !validatedSupportedChains?.length) return

      const dtList: string[] = []
      const orderIdsByDatatoken: Record<string, string> = {}
      const orderTimestampsByDatatoken: Record<string, number> = {}
      let currentPage = 1
      let totalPages = 1

      // Fetch all pages of user orders
      while (currentPage <= totalPages) {
        const orders = await getUserOrders(accountId, cancelToken, currentPage)
        orders?.results?.forEach((order) => {
          const downloadOrder = order as Asset & {
            datatokenAddress?: string
            orderId?: string
            timestamp?: number
          }
          if (!downloadOrder.datatokenAddress) return

          const datatokenAddress = downloadOrder.datatokenAddress.toLowerCase()
          dtList.push(downloadOrder.datatokenAddress)
          if (
            downloadOrder.timestamp &&
            (!orderTimestampsByDatatoken[datatokenAddress] ||
              downloadOrder.timestamp >
                orderTimestampsByDatatoken[datatokenAddress])
          ) {
            orderTimestampsByDatatoken[datatokenAddress] =
              downloadOrder.timestamp
            orderIdsByDatatoken[datatokenAddress] = downloadOrder.orderId || ''
          } else if (
            downloadOrder.orderId &&
            !orderIdsByDatatoken[datatokenAddress]
          ) {
            orderIdsByDatatoken[datatokenAddress] = downloadOrder.orderId
          }
        })
        // eslint-disable-next-line prefer-destructuring
        totalPages = orders?.totalPages || 0
        currentPage++
      }

      const result = await getDownloadAssets(
        dtList,
        validatedSupportedChains,
        cancelToken,
        ownAccount,
        page, // Only paginate here
        orderTimestampsByDatatoken,
        orderIdsByDatatoken
      )
      // Paginate only the download assets
      const downloadedAssets = result?.downloadedAssets || []
      const totalResults = result?.totalResults || 0

      setDownloads(downloadedAssets)
      setDownloadsTotal(totalResults)
    },
    [accountId, ownAccount, validatedSupportedChains]
  )

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  useEffect(() => {
    const cancelToken = axios.CancelToken.source()
    async function updateDownloads() {
      try {
        setIsDownloadsLoading(true)
        await fetchDownloads(cancelToken.token, currentPage)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        LoggerInstance.log(errorMessage)
      } finally {
        setIsDownloadsLoading(false)
      }
    }

    updateDownloads()

    return () => cancelToken.cancel('Request cancelled.')
  }, [currentPage, fetchDownloads])

  //
  // SALES NUMBER
  //
  const [sales, setSales] = useState(0)

  const activeChainIds = useMemo(
    () => validatedSupportedChains || [],
    [validatedSupportedChains]
  )

  useEffect(() => {
    if (!accountId || chainIds.length === 0) {
      setSales(0)
      setRevenue({})
      return
    }
    async function getUserSalesNumber() {
      try {
        const tokenSymbolMap =
          approvedBaseTokens?.reduce<Record<string, string>>((map, token) => {
            if (token?.address && token?.symbol) {
              map[token.address.toLowerCase()] = token.symbol
            }
            return map
          }, {}) || {}
        const { totalOrders, revenueByToken } = await getUserSalesAndRevenue(
          accountId,
          activeChainIds,
          undefined,
          undefined,
          tokenSymbolMap
        )
        setSales(totalOrders)
        setRevenue(revenueByToken)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        LoggerInstance.error(errorMessage)
      }
    }
    getUserSalesNumber()
  }, [accountId, approvedBaseTokens, chainIds, newCancelToken])

  async function getEscrowFunds() {
    if (!accountId || !isEthAddress || !walletClient || !chainId) {
      setEscrowFundsByToken({})
      return
    }

    try {
      const { escrowAddress } = getOceanConfig(chainId)
      const escrow = new EscrowContract(
        escrowAddress,
        walletClient as Signer,
        chainId
      )

      const feeTokenAddresses = new Set<string>()
      const approvedTokenMap = new Map<string, TokenInfo>()
      approvedBaseTokens?.forEach((token) => {
        if (token?.address) {
          const normalizedAddress = token.address.toLowerCase()
          feeTokenAddresses.add(token.address)
          approvedTokenMap.set(normalizedAddress, token)
          tokenInfoCache.current.set(normalizedAddress, token)
        }
      })

      const providerUrl = appConfig?.customProviderUrl
      if (!providerUrl) {
        LoggerInstance.warn(
          '[Profile] No provider URL for compute environments'
        )
      } else {
        try {
          const computeEnvs = await getComputeEnvironments(providerUrl, chainId)
          if (!computeEnvs || computeEnvs.length === 0) {
            LoggerInstance.warn('[Profile] No compute environments found')
          } else {
            computeEnvs.forEach((env) => {
              const chainIdString = chainId.toString()
              const envWithFees = env as unknown as {
                fees?: Record<string, Array<{ feeToken?: string }>>
              }
              const fee = envWithFees.fees?.[chainIdString]?.[0]
              if (fee?.feeToken) {
                feeTokenAddresses.add(fee.feeToken)
              }
            })
          }
        } catch (err) {
          LoggerInstance.warn(
            '[Profile] Failed to fetch compute environments',
            err.message
          )
        }
      }

      if (feeTokenAddresses.size === 0) {
        setEscrowFundsByToken({})
        return
      }

      const escrowFundsMap: { [symbol: string]: EscrowFunds } = {}
      const tokenAddresses = Array.from(feeTokenAddresses)
      const results = await Promise.allSettled(
        tokenAddresses.map(async (tokenAddress) => {
          const normalizedAddress = tokenAddress.toLowerCase()
          const cachedToken =
            approvedTokenMap.get(normalizedAddress) ||
            tokenInfoCache.current.get(normalizedAddress)
          const tokenDetailsPromise = cachedToken
            ? Promise.resolve(cachedToken)
            : getTokenInfo(tokenAddress, walletClient.provider)
          const fundsPromise = escrow.getUserFunds(accountId, tokenAddress)
          const [funds, tokenDetails] = await Promise.all([
            fundsPromise,
            tokenDetailsPromise
          ])

          if (!cachedToken) {
            tokenInfoCache.current.set(normalizedAddress, tokenDetails)
          }

          const tokenDecimals = tokenDetails.decimals ?? 18
          const available = formatUnits(funds.available, tokenDecimals)
          const locked = formatUnits(funds.locked, tokenDecimals)

          return {
            symbol: tokenDetails.symbol,
            data: {
              available,
              locked,
              symbol: tokenDetails.symbol,
              address: tokenAddress,
              decimals: tokenDecimals
            }
          }
        })
      )

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          escrowFundsMap[result.value.symbol] = result.value.data
          return
        }
        LoggerInstance.warn(
          `[Profile] Failed to get escrow funds for token ${tokenAddresses[index]}`,
          result.reason?.message || result.reason
        )
      })

      setEscrowFundsByToken(escrowFundsMap)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      LoggerInstance.error('[Profile] Error getting escrow funds', errorMessage)
    }
  }

  useEffect(() => {
    getEscrowFunds()
  }, [
    accountId,
    walletClient,
    isEthAddress,
    chainId,
    appConfig?.customProviderUrl,
    approvedBaseTokens
  ])

  return (
    <ProfileContext.Provider
      value={{
        assets,
        assetsTotal,
        isEthAddress,
        downloads,
        downloadsTotal,
        isDownloadsLoading,
        handlePageChange,
        ownAccount,
        sales,
        revenue,
        escrowFundsByToken,
        refreshEscrowFunds: getEscrowFunds
      }}
    >
      {children}
    </ProfileContext.Provider>
  )
}

// Helper hook to access the provider values
const useProfile = (): ProfileProviderValue => useContext(ProfileContext)

export { useProfile }
export default ProfileProvider
