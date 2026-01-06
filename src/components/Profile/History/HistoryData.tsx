import { LoggerInstance } from '@oceanprotocol/lib'
import axios, { CancelToken } from 'axios'
import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react'
import { getPublishedAssets, getUserSalesAndRevenue } from '@utils/aquarius'
import { useUserPreferences } from '@context/UserPreferences'
import styles from './HistoryData.module.css'
import { useCancelToken } from '@hooks/useCancelToken'
import Filter from '@components/Search/Filter'
import { useMarketMetadata } from '@context/MarketMetadata'
import { useProfile } from '@context/Profile'
import { useFilter, Filters } from '@context/Filter'
import { TableOceanColumn } from '@shared/atoms/Table'
import Time from '@shared/atoms/Time'
import AssetTitle from '@shared/AssetListTitle'
import NetworkName from '@shared/NetworkName'
import HistoryTable from '@components/@shared/atoms/Table/HistoryTable'
import { AssetExtended } from 'src/@types/AssetExtended'
import { Asset } from 'src/@types/Asset'
import { getAccessDetails } from '@utils/accessDetailsAndPricing'

function HistorySkeleton(): ReactElement {
  const rows = Array.from({ length: 9 })
  const cols = Array.from({ length: 6 })

  return (
    <div className={styles.skeletonWrapper}>
      <div className={styles.skeletonTable}>
        <div className={styles.skeletonHeaderRow}>
          {cols.map((_, idx) => (
            <div key={`header-skel-${idx}`} className={styles.skeletonHeader} />
          ))}
        </div>
        {rows.map((_, rowIdx) => (
          <div key={`skeleton-row-${rowIdx}`} className={styles.skeletonRow}>
            {cols.map((__, colIdx) => (
              <div
                key={`skeleton-cell-${rowIdx}-${colIdx}`}
                className={styles.skeletonCell}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

interface PriceEntry {
  price?: number | string
  baseToken?: TokenInfo
}

interface StatsWithPrices {
  prices?: PriceEntry[]
  orders?: number
  symbol?: string
}

const getBaseTokenSymbol = (asset: AssetExtended): string => {
  const firstAccessDetail = asset.accessDetails?.[0]
  if (firstAccessDetail?.baseToken?.symbol) {
    return firstAccessDetail.baseToken.symbol
  }

  const stats = asset.indexedMetadata?.stats?.[0] as StatsWithPrices | undefined
  const priceEntry = stats?.prices?.[0]
  if (priceEntry?.baseToken?.symbol) {
    return priceEntry.baseToken.symbol
  }

  return 'OCEAN'
}

const getPrice = (asset: AssetExtended): number => {
  const firstAccessDetail = asset.accessDetails?.[0]
  if (firstAccessDetail?.price) {
    const priceValue =
      typeof firstAccessDetail.price === 'string'
        ? Number(firstAccessDetail.price)
        : firstAccessDetail.price
    if (!isNaN(priceValue)) {
      return priceValue
    }
  }

  const stats = asset.indexedMetadata?.stats?.[0] as StatsWithPrices | undefined
  const priceEntry = stats?.prices?.[0]
  if (priceEntry?.price) {
    const priceValue =
      typeof priceEntry.price === 'string'
        ? Number(priceEntry.price)
        : priceEntry.price
    if (!isNaN(priceValue)) {
      return priceValue
    }
  }

  return 0
}

const getOrders = (asset: AssetExtended) =>
  asset.indexedMetadata?.stats?.[0]?.orders || 0

const buildRevenueByToken = (assets: AssetExtended[] = []) => {
  const map: Record<string, number> = {}
  assets.forEach((asset) => {
    const price = getPrice(asset)
    const orders = getOrders(asset)
    const symbol = getBaseTokenSymbol(asset)
    const revenue = orders * price
    if (!symbol || isNaN(revenue)) return
    map[symbol] = (map[symbol] || 0) + revenue
  })
  return map
}

const filterAndSeedRevenue = (
  revenue: Record<string, number>,
  approvedBaseTokens?: { symbol: string }[]
) => {
  const seeded = { ...(revenue || {}) }
  approvedBaseTokens?.forEach((token) => {
    if (!seeded[token.symbol]) seeded[token.symbol] = 0
  })

  return seeded
}

export function SkeletonTable(): ReactElement {
  return <HistorySkeleton />
}

const columns: TableOceanColumn<AssetExtended>[] = [
  {
    name: 'Dataset',
    selector: (asset) => <AssetTitle asset={asset} />
  },
  {
    name: 'Network',
    selector: (asset) => (
      <NetworkName networkId={asset.credentialSubject.chainId} />
    )
  },
  {
    name: 'Datatoken',
    selector: (asset) => asset.indexedMetadata?.stats?.[0]?.symbol || '-'
  },
  {
    name: 'Time',
    selector: (asset) => {
      const unixTime = Math.floor(
        new Date(asset.credentialSubject.metadata.created).getTime()
      ).toString()
      return <Time date={unixTime} relative isUnix />
    }
  },
  {
    name: 'Sales',
    selector: (asset) => getOrders(asset)
  },
  {
    name: 'Price',
    selector: (asset) => {
      const price = getPrice(asset)
      const tokenSymbol = getBaseTokenSymbol(asset)
      return `${price} ${tokenSymbol}`
    }
  },
  {
    name: 'Revenue',
    selector: (asset) => {
      const price = getPrice(asset)
      const orders = getOrders(asset)
      const tokenSymbol = getBaseTokenSymbol(asset)
      return `${orders * price} ${tokenSymbol}`
    }
  }
]

export default function HistoryData({
  accountId
}: {
  accountId: string
}): ReactElement {
  const { appConfig } = useMarketMetadata()
  const { chainIds } = useUserPreferences()
  const { approvedBaseTokens } = useMarketMetadata()
  const { ownAccount } = useProfile()
  const { filters, ignorePurgatory } = useFilter()
  const activeChainIds = useMemo(
    () =>
      (chainIds && chainIds.length > 0
        ? chainIds
        : appConfig?.chainIdsSupported) || [],
    [chainIds, appConfig?.chainIdsSupported]
  )
  const filtersKey = useMemo(() => JSON.stringify(filters || {}), [filters])
  const [queryResult, setQueryResult] = useState<PagedAssets>()
  const [isLoading, setIsLoading] = useState(true)
  const [isTableLoading, setIsTableLoading] = useState(false)
  const [page, setPage] = useState<number>(0)
  const [revenueTotal, setRevenueTotal] = useState(0)
  const [revenueByToken, setRevenueByToken] = useState<Record<string, number>>(
    {}
  )
  const [sales, setSales] = useState(0)
  const [accessDetailsCache, setAccessDetailsCache] = useState<
    Record<string, AccessDetails>
  >({})

  const newCancelToken = useCancelToken()

  useEffect(() => {
    if (!accountId || activeChainIds.length === 0) return

    const source = axios.CancelToken.source()

    async function fetchSalesAndRevenue() {
      try {
        setIsLoading(true)

        const { totalOrders, totalRevenue, revenueByToken, results } =
          await getUserSalesAndRevenue(
            accountId,
            activeChainIds,
            filters,
            source.token
          )

        setSales(totalOrders)
        setRevenueTotal(totalRevenue)
        setRevenueByToken(
          filterAndSeedRevenue(revenueByToken || {}, approvedBaseTokens)
        )
      } catch (error) {
        LoggerInstance.error(
          'Failed to fetch user sales/revenue',
          error.message
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchSalesAndRevenue()
    return () => {
      source.cancel('history-sales-cancelled')
    }
  }, [accountId, activeChainIds, filtersKey])

  const getPublished = useCallback(
    async (
      account: string,
      currentPage: number,
      currentFilters: Filters,
      cancelToken: CancelToken
    ) => {
      try {
        setIsTableLoading(true)
        const result = await getPublishedAssets(
          account.toLowerCase(),
          activeChainIds,
          cancelToken,
          ownAccount && ignorePurgatory,
          ownAccount,
          currentFilters,
          currentPage
        )
        let enrichedResults: AssetExtended[] = []
        if (result?.results) {
          enrichedResults = await Promise.all(
            result.results.map(async (item) => {
              try {
                const cached = accessDetailsCache[item.id]
                const accessDetails =
                  cached ||
                  (await getAccessDetails(
                    item.credentialSubject.chainId,
                    item.credentialSubject.services[0],
                    account,
                    newCancelToken()
                  ))
                if (!cached && accessDetails) {
                  setAccessDetailsCache((prev) => ({
                    ...prev,
                    [item.id]: accessDetails
                  }))
                }
                return {
                  ...item,
                  accessDetails: [accessDetails]
                } as AssetExtended
              } catch (err) {
                const errorMessage =
                  err instanceof Error ? err.message : String(err)
                LoggerInstance.warn(
                  `[History] Failed to fetch access details for ${item.id}`,
                  errorMessage
                )
                return { ...item, accessDetails: [] } as AssetExtended
              }
            })
          )
        }

        const computedRevenue = buildRevenueByToken(enrichedResults)
        const computedTotal = Object.values(computedRevenue).reduce(
          (acc, val) => acc + Number(val || 0),
          0
        )

        if (Object.keys(computedRevenue).length > 0) {
          setRevenueByToken((prev) => {
            if (Object.keys(prev || {}).length > 0) return prev
            return filterAndSeedRevenue(computedRevenue, approvedBaseTokens)
          })
          setRevenueTotal((prev) =>
            prev && prev > 0 ? prev : computedTotal > 0 ? computedTotal : 0
          )
        }

        setQueryResult(
          result
            ? {
                ...result,
                results: enrichedResults.length
                  ? enrichedResults
                  : result.results || []
              }
            : result
        )
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error)
        LoggerInstance.error(errorMessage)
      } finally {
        setIsTableLoading(false)
      }
    },
    [activeChainIds, ignorePurgatory, newCancelToken, ownAccount]
  )

  useEffect(() => {
    if (queryResult && queryResult.totalPages < page) setPage(1)
  }, [page, queryResult])

  useEffect(() => {
    if (!accountId || activeChainIds.length === 0) return
    const source = axios.CancelToken.source()
    getPublished(accountId, page, filters, source.token)
    return () => source.cancel('history-published-cancelled')
  }, [accountId, ownAccount, page, getPublished, filtersKey])

  return accountId ? (
    <div className={styles.containerHistory}>
      <div className={styles.filterContainer}>
        <Filter showPurgatoryOption={ownAccount} expanded showTime />
      </div>
      <div className={styles.tableContainer}>
        {isTableLoading && <HistorySkeleton />}
        {queryResult &&
          queryResult?.results &&
          queryResult.results.length > 0 && (
            <HistoryTable
              columns={columns}
              data={queryResult.results}
              paginationPerPage={9}
              isLoading={isTableLoading}
              emptyMessage={
                chainIds.length === 0 ? 'No network selected' : null
              }
              exportEnabled={true}
              onPageChange={(newPage) => {
                setPage(newPage)
              }}
              showPagination
              page={queryResult?.page > 0 ? queryResult?.page - 1 : 1}
              totalPages={queryResult?.totalPages}
              revenueByToken={revenueByToken}
              revenueTotal={revenueTotal}
              sales={sales}
              items={queryResult?.totalResults}
              allResults={queryResult.results}
            />
          )}
        {!isLoading &&
          (!queryResult ||
            !queryResult?.results ||
            queryResult.results.length === 0) && (
            <div className={styles.empty}>No results found</div>
          )}
      </div>
    </div>
  ) : (
    <div>Please connect your wallet.</div>
  )
}
