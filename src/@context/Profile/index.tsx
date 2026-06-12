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
import { useAccount, useChainId } from 'wagmi'
import { getOceanConfig } from '@utils/ocean'
import { getTokenBalance, getTokenInfo } from '@utils/wallet'
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

interface ProfileTokenBalance {
  balance: string
  symbol: string
  address: string
  decimals: number
  accountId: string
}

interface ProfileProviderValue {
  assets: Asset[]
  assetsTotal: number
  activeAssetsTotal: number
  isEthAddress: boolean
  downloads: DownloadedAsset[]
  downloadsTotal: number
  activeDownloadsTotal: number
  isDownloadsLoading: boolean
  sales: number
  activeSales: number
  ownAccount: boolean
  revenue: { [symbol: string]: number }
  revenueByNetwork: { [chainId: string]: { [symbol: string]: number } }
  escrowFundsByToken: { [symbol: string]: EscrowFunds }
  tokenBalancesByToken: { [symbol: string]: ProfileTokenBalance }
  connectedAccountId?: string
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
  const { address: wagmiAccountId } = useAccount()
  const chainId = useChainId() // FIX: Replaced useNetwork
  const { chainIds } = useUserPreferences()
  const { appConfig, approvedBaseTokens, validatedSupportedChains } =
    useMarketMetadata()
  const [revenue, setRevenue] = useState<{ [symbol: string]: number }>({})
  const [revenueByNetwork, setRevenueByNetwork] = useState<{
    [chainId: string]: { [symbol: string]: number }
  }>({})
  const [escrowFundsByToken, setEscrowFundsByToken] = useState<{
    [symbol: string]: EscrowFunds
  }>({})
  const [tokenBalancesByToken, setTokenBalancesByToken] = useState<{
    [symbol: string]: ProfileTokenBalance
  }>({})
  const [connectedAccountId, setConnectedAccountId] = useState<string>()
  const tokenInfoCache = useRef<Map<string, TokenInfo>>(new Map())
  const tokenBalanceFetchKey = useRef<string>()
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
  const [activeAssetsTotal, setActiveAssetsTotal] = useState(0)
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

        if (chainId) {
          const activeChainResult = await getPublishedAssets(
            accountId,
            [chainId],
            cancelTokenSource.token,
            ownAccount,
            ownAccount
          )
          setActiveAssetsTotal(activeChainResult?.totalResults || 0)
        } else {
          setActiveAssetsTotal(0)
        }

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
    chainId,
    isEthAddress,
    ownAccount
  ])

  //
  // DOWNLOADS
  //
  const [downloads, setDownloads] = useState<DownloadedAsset[]>()
  const [downloadsTotal, setDownloadsTotal] = useState(0)
  const [activeDownloadsTotal, setActiveDownloadsTotal] = useState(0)
  const [isDownloadsLoading, setIsDownloadsLoading] = useState<boolean>()
  const [currentPage, setCurrentPage] = useState(1)

  const fetchDownloadAssetsForChains = useCallback(
    async (
      cancelToken: CancelToken,
      targetChainIds: number[],
      page = 1
    ): Promise<{
      downloadedAssets: DownloadedAsset[]
      totalResults: number
    }> => {
      if (!accountId || !targetChainIds?.length) {
        return { downloadedAssets: [], totalResults: 0 }
      }

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
        targetChainIds,
        cancelToken,
        ownAccount,
        page, // Only paginate here
        orderTimestampsByDatatoken,
        orderIdsByDatatoken
      )
      // Paginate only the download assets
      const downloadedAssets = result?.downloadedAssets || []
      const totalResults = result?.totalResults || 0

      return { downloadedAssets, totalResults }
    },
    [accountId, ownAccount]
  )

  const fetchDownloads = useCallback(
    async (cancelToken: CancelToken, page = 1) => {
      const result = await fetchDownloadAssetsForChains(
        cancelToken,
        validatedSupportedChains,
        page
      )
      setDownloads(result.downloadedAssets)
      setDownloadsTotal(result.totalResults)
    },
    [fetchDownloadAssetsForChains, validatedSupportedChains]
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

  useEffect(() => {
    const cancelToken = axios.CancelToken.source()
    async function updateActiveDownloadsTotal() {
      try {
        if (!chainId) {
          setActiveDownloadsTotal(0)
          return
        }

        const result = await fetchDownloadAssetsForChains(
          cancelToken.token,
          [chainId],
          1
        )
        setActiveDownloadsTotal(result.totalResults)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        LoggerInstance.log(errorMessage)
      }
    }

    updateActiveDownloadsTotal()

    return () => cancelToken.cancel('Request cancelled.')
  }, [chainId, fetchDownloadAssetsForChains])

  //
  // SALES NUMBER
  //
  const [sales, setSales] = useState(0)
  const [activeSales, setActiveSales] = useState(0)

  const activeChainIds = useMemo(
    () => validatedSupportedChains || [],
    [validatedSupportedChains]
  )

  useEffect(() => {
    if (!accountId || activeChainIds.length === 0) {
      setSales(0)
      setActiveSales(0)
      setRevenue({})
      setRevenueByNetwork({})
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
        const { totalOrders, revenueByToken, revenueByNetwork } =
          await getUserSalesAndRevenue(
            accountId,
            activeChainIds,
            undefined,
            undefined,
            tokenSymbolMap
          )
        setSales(totalOrders)
        setRevenue(revenueByToken)
        setRevenueByNetwork(revenueByNetwork)

        if (chainId) {
          const activeChainSales = await getUserSalesAndRevenue(
            accountId,
            [chainId],
            undefined,
            undefined,
            tokenSymbolMap
          )
          setActiveSales(activeChainSales.totalOrders)
        } else {
          setActiveSales(0)
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        LoggerInstance.error(errorMessage)
      }
    }
    getUserSalesNumber()
  }, [accountId, activeChainIds, approvedBaseTokens, chainId, newCancelToken])

  const getEscrowFunds = useCallback(async () => {
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
  }, [
    accountId,
    appConfig?.customProviderUrl,
    approvedBaseTokens,
    chainId,
    isEthAddress,
    walletClient
  ])

  useEffect(() => {
    getEscrowFunds()
  }, [getEscrowFunds])

  const getTokenBalances = useCallback(async () => {
    if (!ownAccount || !walletClient || !chainId) {
      tokenBalanceFetchKey.current = undefined
      setConnectedAccountId(undefined)
      setTokenBalancesByToken({})
      return
    }

    try {
      const signerAddress = await walletClient.getAddress()
      const balanceAccountId = signerAddress || wagmiAccountId

      if (!balanceAccountId || !isAddress(balanceAccountId)) {
        tokenBalanceFetchKey.current = undefined
        setConnectedAccountId(undefined)
        setTokenBalancesByToken({})
        return
      }

      setConnectedAccountId(balanceAccountId)

      const tokenAddresses = new Set<string>()
      const approvedTokenMap = new Map<string, TokenInfo>()
      approvedBaseTokens?.forEach((token) => {
        if (!token?.address) return
        const normalizedAddress = token.address.toLowerCase()
        tokenAddresses.add(token.address)
        approvedTokenMap.set(normalizedAddress, token)
        tokenInfoCache.current.set(normalizedAddress, token)
      })
      Object.values(escrowFundsByToken || {}).forEach((token) => {
        if (!token?.address) return
        const normalizedAddress = token.address.toLowerCase()
        tokenAddresses.add(token.address)
        tokenInfoCache.current.set(normalizedAddress, {
          address: token.address,
          name: token.symbol,
          symbol: token.symbol,
          decimals: token.decimals
        })
      })

      const oceanTokenAddress = getOceanConfig(chainId)?.oceanTokenAddress
      if (oceanTokenAddress) tokenAddresses.add(oceanTokenAddress)

      const providerUrl = appConfig?.customProviderUrl
      if (providerUrl) {
        try {
          const computeEnvs = await getComputeEnvironments(providerUrl, chainId)
          computeEnvs?.forEach((env) => {
            const envWithFees = env as unknown as {
              fees?: Record<string, Array<{ feeToken?: string }>>
            }
            const fee = envWithFees.fees?.[chainId.toString()]?.[0]
            if (fee?.feeToken) tokenAddresses.add(fee.feeToken)
          })
        } catch (err) {
          LoggerInstance.warn(
            '[Profile] Failed to fetch compute token balances',
            err instanceof Error ? err.message : String(err)
          )
        }
      }

      if (tokenAddresses.size === 0) {
        tokenBalanceFetchKey.current = undefined
        setTokenBalancesByToken({})
        return
      }

      const nextTokenBalanceFetchKey = JSON.stringify({
        accountId: balanceAccountId.toLowerCase(),
        chainId,
        providerUrl,
        tokenAddresses: Array.from(tokenAddresses)
          .map((address) => address.toLowerCase())
          .sort()
      })
      if (tokenBalanceFetchKey.current === nextTokenBalanceFetchKey) return
      tokenBalanceFetchKey.current = nextTokenBalanceFetchKey

      const balancesMap: { [symbol: string]: ProfileTokenBalance } = {}
      const results = await Promise.allSettled(
        Array.from(tokenAddresses).map(async (tokenAddress) => {
          const normalizedAddress = tokenAddress.toLowerCase()
          const cachedToken =
            approvedTokenMap.get(normalizedAddress) ||
            tokenInfoCache.current.get(normalizedAddress)
          const tokenDetails =
            cachedToken ||
            (await getTokenInfo(tokenAddress, walletClient.provider))

          if (!cachedToken) {
            tokenInfoCache.current.set(normalizedAddress, tokenDetails)
          }

          const tokenDecimals = tokenDetails.decimals ?? 18
          const balance = await getTokenBalance(
            balanceAccountId,
            tokenDecimals,
            tokenAddress,
            walletClient.provider
          )
          const normalizedBalance = balance || '0'

          return {
            balance: normalizedBalance,
            symbol: tokenDetails.symbol,
            address: tokenAddress,
            decimals: tokenDecimals,
            accountId: balanceAccountId
          }
        })
      )

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          balancesMap[result.value.symbol] = result.value
          return
        }

        LoggerInstance.warn(
          '[Profile] Failed to get token balance',
          result.reason?.message || result.reason
        )
      })

      setTokenBalancesByToken(balancesMap)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      LoggerInstance.error(
        '[Profile] Error getting token balances',
        errorMessage
      )
      tokenBalanceFetchKey.current = undefined
      setTokenBalancesByToken({})
    }
  }, [
    appConfig?.customProviderUrl,
    approvedBaseTokens,
    chainId,
    escrowFundsByToken,
    ownAccount,
    wagmiAccountId,
    walletClient
  ])

  useEffect(() => {
    getTokenBalances()
  }, [getTokenBalances])

  return (
    <ProfileContext.Provider
      value={{
        assets,
        assetsTotal,
        activeAssetsTotal,
        isEthAddress,
        downloads,
        downloadsTotal,
        activeDownloadsTotal,
        isDownloadsLoading,
        handlePageChange,
        ownAccount,
        sales,
        activeSales,
        revenue,
        revenueByNetwork,
        escrowFundsByToken,
        tokenBalancesByToken,
        connectedAccountId,
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
