import { Asset, LoggerInstance } from '@oceanprotocol/lib'
import { ReactElement, useEffect, useState } from 'react'
import { getPublishedAssets } from '@utils/aquarius'
import { useUserPreferences } from '@context/UserPreferences'
import styles from './HistoryData.module.css'
import { useCancelToken } from '@hooks/useCancelToken'
import Filter from '@components/Search/Filter'
import { useMarketMetadata } from '@context/MarketMetadata'
import { CancelToken } from 'axios'
import { useProfile } from '@context/Profile'
import { useFilter, Filters } from '@context/Filter'
import { useDebouncedCallback } from 'use-debounce'
import { TableOceanColumn } from '@shared/atoms/Table'
import Time from '@shared/atoms/Time'
import AssetTitle from '@shared/AssetListTitle'
import NetworkName from '@shared/NetworkName'
import HistoryTable from '@components/@shared/atoms/Table/HistoryTable'
import formatRevenue from '../utils'

const columns: TableOceanColumn<Asset>[] = [
  {
    name: 'Dataset',
    selector: (asset) => <AssetTitle asset={asset} />
  },
  {
    name: 'Network',
    selector: (asset) => <NetworkName networkId={asset.chainId} />
  },
  {
    name: 'Datatoken',
    selector: (asset) => asset.datatokens[0].symbol
  },
  {
    name: 'Time',
    selector: (asset) => (
      <Time
        date={Math.floor(
          new Date(asset.event.datetime).getTime() / 1000
        ).toString()}
        relative
        isUnix
      />
    )
  },
  {
    name: 'Sales',
    selector: (asset) => asset.stats.orders
  },
  {
    name: 'Revenue',
    selector: (asset) =>
      `${asset.stats?.orders * asset.stats?.price?.value} ${
        asset.stats?.price?.tokenSymbol || ''
      }` || 0
  }
]

export default function HistoryData({
  accountId
}: {
  accountId: string
}): ReactElement {
  const { appConfig } = useMarketMetadata()
  const { chainIds } = useUserPreferences()
  const { ownAccount } = useProfile()
  const { filters, ignorePurgatory } = useFilter()
  const [queryResult, setQueryResult] = useState<PagedAssets>()
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState<number>(1)
  const [revenue, setRevenue] = useState<Revenue[]>()
  const [sales, setSales] = useState(0)
  const newCancelToken = useCancelToken()
  const getPublished = useDebouncedCallback(
    async (
      accountId: string,
      chainIds: number[],
      page: number,
      filters: Filters,
      ignorePurgatory: boolean,
      cancelToken: CancelToken
    ) => {
      try {
        setIsLoading(true)
        const result = await getPublishedAssets(
          accountId.toLowerCase(),
          chainIds,
          cancelToken,
          ownAccount && ignorePurgatory,
          ownAccount,
          filters,
          page
        )
        const { totalOrders, totalRevenue } = result.aggregations
        setSales(totalOrders.value)
        console.log('results:', result)
        console.log('revenue:', totalRevenue)
        setRevenue(totalRevenue.buckets)
        setQueryResult(result)
      } catch (error) {
        LoggerInstance.error(error.message)
      } finally {
        setIsLoading(false)
      }
    },
    500
  )

  useEffect(() => {
    if (queryResult && queryResult.totalPages < page) setPage(1)
  }, [page, queryResult])

  useEffect(() => {
    if (!accountId) return

    getPublished(
      accountId,
      chainIds,
      page,
      filters,
      ignorePurgatory,
      newCancelToken()
    )
  }, [
    accountId,
    ownAccount,
    page,
    appConfig?.metadataCacheUri,
    chainIds,
    newCancelToken,
    getPublished,
    filters,
    ignorePurgatory
  ])

  return accountId ? (
    <div className={styles.containerHistory}>
      <div className={styles.filterContainer}>
        <Filter showPurgatoryOption={ownAccount} expanded showTime={true} />
      </div>
      {queryResult && (
        <div className={styles.tableContainer}>
          <HistoryTable
            columns={columns}
            data={queryResult.results}
            paginationPerPage={10}
            isLoading={isLoading}
            emptyMessage={chainIds.length === 0 ? 'No network selected' : null}
            exportEnabled={true}
            onPageChange={(newPage) => {
              setPage(newPage)
            }}
            showPagination
            page={queryResult?.page}
            totalPages={queryResult?.totalPages}
            revenue={formatRevenue(revenue)}
            sales={sales}
            items={queryResult?.totalResults}
          />
        </div>
      )}
    </div>
  ) : (
    <div>Please connect your wallet.</div>
  )
}
