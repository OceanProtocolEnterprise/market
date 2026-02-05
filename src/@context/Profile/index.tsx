import {
  useContext,
  useState,
  useEffect,
  createContext,
  ReactElement,
  useCallback,
  ReactNode,
  useRef
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
import { getAccessDetails } from '@utils/accessDetailsAndPricing'
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

const refreshInterval = 10000 // 10 sec.

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
  const { appConfig, approvedBaseTokens } = useMarketMetadata()
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
        setAssets(result.results)
        setAssetsTotal(result.totalResults)

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
  const [downloadsInterval, setDownloadsInterval] = useState<NodeJS.Timeout>()
  const [currentPage, setCurrentPage] = useState(1)

  const fetchDownloads = useCallback(
    async (cancelToken: CancelToken, page = 1) => {
      if (!accountId || !chainIds) return

      const dtList: string[] = []
      let currentPage = 1
      let totalPages = 1

      // Fetch all pages of user orders
      while (currentPage <= totalPages) {
        const orders = await getUserOrders(accountId, cancelToken, currentPage)
        orders?.results?.forEach((order) => {
          if (order.datatokenAddress) dtList.push(order.datatokenAddress)
        })
        // eslint-disable-next-line prefer-destructuring
        totalPages = orders?.totalPages || 0
        currentPage++
      }

      const result = await getDownloadAssets(
        dtList,
        chainIds,
        cancelToken,
        ownAccount,
        page // Only paginate here
      )
      // Paginate only the download assets
      const downloadedAssets = result?.downloadedAssets || []
      const totalResults = result?.totalResults || 0

      setDownloads(downloadedAssets)
      setDownloadsTotal(totalResults)
    },
    [accountId, chainIds, ownAccount]
  )

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  useEffect(() => {
    const cancelToken = axios.CancelToken.source()
    fetchDownloads(cancelToken.token, currentPage)

    return () => cancelToken.cancel('Request cancelled.')
  }, [currentPage, fetchDownloads])

  useEffect(() => {
    const cancelTokenSource = axios.CancelToken.source()

    async function getDownloadAssets() {
      if (!appConfig?.metadataCacheUri) return

      try {
        setIsDownloadsLoading(true)
        await fetchDownloads(cancelTokenSource.token)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        LoggerInstance.log(errorMessage)
      } finally {
        setIsDownloadsLoading(false)
      }
    }
    getDownloadAssets()

    if (downloadsInterval) return
    const interval = setInterval(async () => {
      await fetchDownloads(cancelTokenSource.token)
    }, refreshInterval)
    setDownloadsInterval(interval)

    return () => {
      cancelTokenSource.cancel()
      clearInterval(downloadsInterval)
    }
  }, [fetchDownloads, appConfig.metadataCacheUri, downloadsInterval])

  //
  // SALES NUMBER
  //
  const [sales, setSales] = useState(0)

  useEffect(() => {
    if (!accountId || chainIds.length === 0) {
      setSales(0)
      setRevenue({})
      return
    }
    async function getUserSalesNumber() {
      try {
        const { totalOrders, revenueByToken, results } =
          await getUserSalesAndRevenue(accountId, chainIds)
        setSales(totalOrders)

        const enrichedResults = await Promise.all(
          results.map(async (item) => {
            try {
              const accessDetails = await getAccessDetails(
                item.credentialSubject.chainId,
                item.credentialSubject.services[0],
                accountId,
                newCancelToken()
              )
              return {
                ...item,
                accessDetails: [accessDetails]
              }
            } catch (err) {
              LoggerInstance.warn(
                `[Profile] Failed to fetch access details for ${item.id}`,
                err.message
              )
              return { ...item, accessDetails: [] }
            }
          })
        )

        const revenueByTokenFromAccess: { [symbol: string]: number } = {}
        enrichedResults.forEach((asset) => {
          const orders = asset?.indexedMetadata?.stats?.[0]?.orders || 0
          const priceEntry = (
            asset.indexedMetadata?.stats?.[0] as {
              prices?: Array<{ price?: number | string }>
            }
          )?.prices?.[0]
          const price = priceEntry?.price ? Number(priceEntry.price) : 0

          const firstAccessDetail = asset.accessDetails?.[0]
          const baseTokenSymbol =
            firstAccessDetail?.baseToken?.symbol || undefined

          if (!baseTokenSymbol) return

          const revenueValue = orders * price
          if (revenueValue > 0) {
            if (!revenueByTokenFromAccess[baseTokenSymbol]) {
              revenueByTokenFromAccess[baseTokenSymbol] = 0
            }
            revenueByTokenFromAccess[baseTokenSymbol] += revenueValue
          }
        })

        const finalRevenueMap =
          Object.keys(revenueByTokenFromAccess).length > 0
            ? revenueByTokenFromAccess
            : revenueByToken

        setRevenue(finalRevenueMap)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        LoggerInstance.error(errorMessage)
      }
    }
    getUserSalesNumber()
  }, [accountId, chainIds, newCancelToken])

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
