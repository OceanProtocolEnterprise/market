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
import { getPublishedAssets, getUserSalesAndRevenue } from '@utils/aquarius'
import styles from './HistoryData.module.css'
import { useCancelToken } from '@hooks/useCancelToken'
import Filter from '@components/Search/Filter'
import { useMarketMetadata } from '@context/MarketMetadata'
import { useProfile } from '@context/Profile'
import { useFilter, Filters } from '@context/Filter'
import { TableOceanColumn } from '@shared/atoms/Table'
import AssetTitle from '@shared/AssetListTitle'
import NetworkName from '@shared/NetworkName'
import HistoryTable from '@components/@shared/atoms/Table/HistoryTable'
import useNetworkMetadata, {
  getNetworkDataById,
  getNetworkDisplayName
} from '@hooks/useNetworkMetadata'
import { AssetExtended } from 'src/@types/AssetExtended'
import { getAccessDetails } from '@utils/accessDetailsAndPricing'
import TableSkeleton from '@shared/atoms/Table/Skeleton'
import ExpandIcon from '@images/expand.svg'
import MinimizeIcon from '@images/minimize.svg'
import ExpandedServices from './ExpandedServices'
import { truncateDid } from '@utils/string'
import ExplorerLink from '@shared/ExplorerLink'
import Time from '@shared/atoms/Time'

// 6 cols: Dataset | DDO DID | Network | Time | Transaction ID | Sales
const headerWidths = ['55%', '60%', '70%', '55%', '60%', '50%']
const rowWidths = [
  ['80%', '60%', '65%', '55%', '70%', '40%'],
  ['70%', '55%', '55%', '65%', '60%', '50%'],
  ['85%', '65%', '70%', '50%', '75%', '45%'],
  ['75%', '60%', '60%', '60%', '65%', '35%'],
  ['65%', '70%', '75%', '55%', '55%', '50%'],
  ['80%', '55%', '65%', '65%', '70%', '40%'],
  ['70%', '65%', '55%', '50%', '60%', '55%'],
  ['85%', '60%', '70%', '60%', '75%', '45%'],
  ['75%', '70%', '60%', '55%', '65%', '50%']
]

function HistorySkeleton(): ReactElement {
  return (
    <TableSkeleton
      className={styles.skeletonWrapper}
      gridTemplateColumns="2fr 1.2fr 1.2fr 1fr 1.2fr 0.6fr"
      headerWidths={headerWidths}
      rowWidths={rowWidths}
    />
  )
}

const getOrders = (asset: AssetExtended) =>
  asset.indexedMetadata?.stats?.reduce(
    (totalOrders, stats) => totalOrders + (stats?.orders || 0),
    0
  ) || 0

export default function HistoryData({
  accountId
}: {
  accountId: string
}): ReactElement {
  const { approvedBaseTokens, validatedSupportedChains } = useMarketMetadata()
  const { ownAccount } = useProfile()
  const { filters, ignorePurgatory } = useFilter()
  const { networksList } = useNetworkMetadata()

  const columns: TableOceanColumn<AssetExtended>[] = useMemo(
    () => [
      {
        name: 'Dataset',
        selector: (asset) => <AssetTitle asset={asset} maxTitleLength={80} />
      },
      {
        name: 'DDO DID',
        selector: (asset) => (
          <span className={styles.identifier} title={asset.id}>
            {truncateDid(asset.id)}
          </span>
        )
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
        name: 'Time',
        selector: (asset) => {
          const created = asset.credentialSubject?.metadata?.created
          return created ? <Time date={created} relative /> : '-'
        }
      },
      {
        name: 'Transaction ID',
        selector: (asset) => {
          const txid = asset.indexedMetadata?.event?.txid
          if (!txid) return ''

          return (
            <ExplorerLink
              networkId={asset.credentialSubject.chainId}
              path={`/tx/${txid}`}
              className={styles.identifier}
            >
              <span title={txid}>{truncateDid(txid)}</span>
            </ExplorerLink>
          )
        }
      },
      {
        name: 'Sales',
        selector: (asset) => getOrders(asset),
        maxWidth: '5rem'
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
  const tokenSymbolMap = useMemo(() => {
    const map: Record<string, string> = {}
    approvedBaseTokens?.forEach((token) => {
      if (!token?.address || !token?.symbol) return
      map[token.address.toLowerCase()] = token.symbol
    })
    return map
  }, [approvedBaseTokens])
  const filtersKey = useMemo(() => JSON.stringify(filters || {}), [filters])
  const [queryResult, setQueryResult] = useState<PagedAssets>()
  const [summary, setSummary] = useState<{
    sales: number
    revenueByToken: Record<string, number>
    revenueByNetwork: Record<string, Record<string, number>>
  }>({
    sales: 0,
    revenueByToken: {},
    revenueByNetwork: {}
  })
  const [isTableLoading, setIsTableLoading] = useState(false)
  const [page, setPage] = useState<number>(0)
  const [accessDetailsCache, setAccessDetailsCache] = useState<
    Record<string, AccessDetails[]>
  >({})
  const latestRequestRef = useRef(0)
  const accessDetailsCacheRef = useRef<Record<string, AccessDetails[]>>({})

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
        const [result, summaryResult] = await Promise.all([
          getPublishedAssets(
            account.toLowerCase(),
            activeChainIds,
            cancelToken,
            ownAccount && ignorePurgatory,
            ownAccount,
            currentFilters,
            currentPage
          ),
          getUserSalesAndRevenue(
            account.toLowerCase(),
            activeChainIds,
            currentFilters,
            cancelToken,
            tokenSymbolMap,
            ownAccount && ignorePurgatory,
            ownAccount
          )
        ])
        console.log('HERE RESULT', result, summaryResult)
        if (requestId !== latestRequestRef.current || !result) return
        setSummary({
          sales: summaryResult.totalOrders,
          revenueByToken: summaryResult.revenueByToken,
          revenueByNetwork: summaryResult.revenueByNetwork
        })
        let enrichedResults: AssetExtended[] = []
        if (result?.results) {
          enrichedResults = await Promise.all(
            result.results.map(async (item) => {
              try {
                const cached = accessDetailsCacheRef.current[item.id]
                const accessDetails =
                  cached ||
                  (await Promise.all(
                    item.credentialSubject.services.map((service) =>
                      getAccessDetails(
                        item.credentialSubject.chainId,
                        service,
                        account,
                        newCancelToken()
                      )
                    )
                  ))
                if (!cached && accessDetails) {
                  setAccessDetailsCache((prev) => ({
                    ...prev,
                    [item.id]: accessDetails
                  }))
                }
                return {
                  ...item,
                  accessDetails
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
    [
      activeChainIds,
      ignorePurgatory,
      newCancelToken,
      ownAccount,
      tokenSymbolMap
    ]
  )

  useEffect(() => {
    if (queryResult && queryResult.totalPages < page) setPage(1)
  }, [page, queryResult])

  useEffect(() => {
    if (!accountId || activeChainIds.length === 0) {
      setQueryResult(undefined)
      setSummary({ sales: 0, revenueByToken: {}, revenueByNetwork: {} })
      return
    }
    const source = axios.CancelToken.source()
    getPublished(accountId, page, filters, source.token)
    return () => source.cancel('history-published-cancelled')
  }, [
    accountId,
    activeChainIds.length,
    activeChainIdsKey,
    filters,
    filtersKey,
    getPublished,
    ownAccount,
    page
  ])

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
            revenueByToken={summary.revenueByToken}
            revenueByNetwork={summary.revenueByNetwork}
            revenueTotal={Object.values(summary.revenueByToken).reduce(
              (acc, value) => acc + Number(value || 0),
              0
            )}
            sales={summary.sales}
            items={queryResult?.totalResults || 0}
            allResults={queryResult?.results || []}
            expandableRows
            expandableRowsComponent={ExpandedServices}
            expandableRowDisabled={(row) =>
              !row.credentialSubject?.services?.length
            }
            expandableIcon={{
              collapsed: <ExpandIcon className={styles.expanderIcon} />,
              expanded: <MinimizeIcon className={styles.expanderIcon} />
            }}
          />
        )}
      </div>
    </div>
  ) : (
    <div>Please connect your wallet.</div>
  )
}
