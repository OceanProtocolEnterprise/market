import { LoggerInstance } from '@oceanprotocol/lib'
import axios, { CancelToken } from 'axios'
import {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { getPublishedAssets } from '@utils/aquarius'
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
import useNetworkMetadata, {
  getNetworkDataById,
  getNetworkDisplayName
} from '@hooks/useNetworkMetadata'
import { AssetExtended } from 'src/@types/AssetExtended'
import { getAccessDetails } from '@utils/accessDetailsAndPricing'
import { getBaseTokenSymbol } from '@utils/getBaseTokenSymbol'
import TableSkeleton from '@shared/atoms/Table/Skeleton'

// 7 cols: Dataset | Network | Datatoken | Time | Sales | Price | Revenue
const headerWidths = ['55%', '70%', '65%', '55%', '60%', '55%', '55%']
const rowWidths = [
  ['80%', '65%', '70%', '55%', '40%', '60%', '60%'],
  ['70%', '55%', '60%', '65%', '50%', '55%', '70%'],
  ['85%', '70%', '55%', '50%', '45%', '65%', '65%'],
  ['75%', '60%', '75%', '60%', '35%', '50%', '55%'],
  ['65%', '75%', '65%', '55%', '50%', '70%', '60%'],
  ['80%', '65%', '70%', '65%', '40%', '60%', '65%'],
  ['70%', '55%', '60%', '50%', '55%', '55%', '60%'],
  ['85%', '70%', '65%', '60%', '45%', '65%', '55%'],
  ['75%', '60%', '75%', '55%', '50%', '60%', '65%']
]

function HistorySkeleton(): ReactElement {
  return (
    <TableSkeleton
      className={styles.skeletonWrapper}
      gridTemplateColumns="2.2fr 1.2fr 1fr 1.2fr 0.7fr 0.9fr 0.9fr"
      headerWidths={headerWidths}
      rowWidths={rowWidths}
    />
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

export default function HistoryData({
  accountId
}: {
  accountId: string
}): ReactElement {
  const { approvedBaseTokens, validatedSupportedChains } = useMarketMetadata()
  const { ownAccount, sales, revenue } = useProfile()
  const { filters, ignorePurgatory } = useFilter()
  const { networksList } = useNetworkMetadata()

  const columns: TableOceanColumn<AssetExtended>[] = useMemo(
    () => [
      {
        name: 'Dataset',
        selector: (asset) => <AssetTitle asset={asset} />
      },
      {
        name: 'Network',
        selector: (asset) => {
          const networkData = getNetworkDataById(
            networksList,
            asset.credentialSubject.chainId
          )
          const networkName = getNetworkDisplayName(networkData)
          return (
            <span className={styles.networkWrapper} title={networkName}>
              <NetworkName networkId={asset.credentialSubject.chainId} />
            </span>
          )
        }
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
        selector: (asset) => getOrders(asset),
        maxWidth: '5rem'
      },
      {
        name: 'Price',
        selector: (asset) => {
          const price = getPrice(asset)
          const tokenSymbol = getBaseTokenSymbol(asset)
          return tokenSymbol ? `${price} ${tokenSymbol}` : `${price}`
        },
        maxWidth: '7rem'
      },
      {
        name: 'Revenue',
        selector: (asset) => {
          const price = getPrice(asset)
          const orders = getOrders(asset)
          const tokenSymbol = getBaseTokenSymbol(asset)
          return tokenSymbol
            ? `${orders * price} ${tokenSymbol}`
            : `${orders * price}`
        },
        maxWidth: '7rem'
      }
    ],
    [networksList]
  )
  const activeChainIds = useMemo(
    () => validatedSupportedChains || [],
    [validatedSupportedChains]
  )
  const activeChainIdsKey = useMemo(
    () => JSON.stringify(activeChainIds || []),
    [activeChainIds]
  )
  const filtersKey = useMemo(() => JSON.stringify(filters || {}), [filters])
  const [queryResult, setQueryResult] = useState<PagedAssets>()
  const [isTableLoading, setIsTableLoading] = useState(false)
  const [page, setPage] = useState<number>(0)
  const [accessDetailsCache, setAccessDetailsCache] = useState<
    Record<string, AccessDetails>
  >({})
  const latestRequestRef = useRef(0)
  const accessDetailsCacheRef = useRef<Record<string, AccessDetails>>({})

  const newCancelToken = useCancelToken()

  useEffect(() => {
    accessDetailsCacheRef.current = accessDetailsCache
  }, [accessDetailsCache])

  const getPublished = useCallback(
    async (
      account: string,
      currentPage: number,
      currentFilters: Filters,
      cancelToken: CancelToken
    ) => {
      const requestId = latestRequestRef.current + 1
      latestRequestRef.current = requestId
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
        if (requestId !== latestRequestRef.current || !result) return
        let enrichedResults: AssetExtended[] = []
        if (result?.results) {
          enrichedResults = await Promise.all(
            result.results.map(async (item) => {
              try {
                const cached = accessDetailsCacheRef.current[item.id]
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
        if (requestId !== latestRequestRef.current) return

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
        if (requestId === latestRequestRef.current) {
          setIsTableLoading(false)
        }
      }
    },
    [activeChainIdsKey, ignorePurgatory, newCancelToken, ownAccount]
  )

  useEffect(() => {
    if (queryResult && queryResult.totalPages < page) setPage(1)
  }, [page, queryResult])

  useEffect(() => {
    if (!accountId || activeChainIds.length === 0) return
    const source = axios.CancelToken.source()
    getPublished(accountId, page, filters, source.token)
    return () => source.cancel('history-published-cancelled')
  }, [accountId, ownAccount, page, getPublished, filtersKey, activeChainIdsKey])

  return accountId ? (
    <div className={styles.containerHistory}>
      <div className={styles.filterContainer}>
        <Filter showPurgatoryOption={ownAccount} expanded showTime />
      </div>
      <div className={styles.tableContainer}>
        {isTableLoading ? (
          <HistorySkeleton />
        ) : (
          <HistoryTable
            className={styles.historyTableWrapper}
            columns={columns}
            data={queryResult?.results || []}
            paginationPerPage={9}
            emptyMessage={
              validatedSupportedChains.length === 0
                ? 'No network selected'
                : null
            }
            exportEnabled={Boolean(queryResult?.results?.length)}
            onPageChange={(newPage) => {
              setPage(newPage)
            }}
            showPagination={Boolean(queryResult?.results?.length)}
            page={queryResult?.page > 0 ? queryResult?.page - 1 : 1}
            totalPages={queryResult?.totalPages}
            revenueByToken={filterAndSeedRevenue(
              revenue || {},
              approvedBaseTokens
            )}
            revenueTotal={Object.values(revenue || {}).reduce(
              (acc, value) => acc + Number(value || 0),
              0
            )}
            sales={sales}
            items={queryResult?.totalResults || 0}
            allResults={queryResult?.results || []}
          />
        )}
      </div>
    </div>
  ) : (
    <div>Please connect your wallet.</div>
  )
}
