import { LoggerInstance } from '@oceanprotocol/lib'
import { ReactElement, useEffect, useState } from 'react'
import AssetList from '@shared/AssetList'
import { getPublishedAssets } from '@utils/aquarius'
import styles from './PublishedList.module.css'
import { useCancelToken } from '@hooks/useCancelToken'
import Filter from '@components/Search/Filter'
import { useMarketMetadata } from '@context/MarketMetadata'
import { CancelToken } from 'axios'
import { useProfile } from '@context/Profile'
import { useFilter, Filters } from '@context/Filter'
import { useDebouncedCallback } from 'use-debounce'
import { useUserPreferences } from '@context/UserPreferences'

export default function PublishedList({
  accountId
}: {
  accountId: string
}): ReactElement {
  const { validatedSupportedChains } = useMarketMetadata()
  const { ownAccount } = useProfile()
  const { filters, ignorePurgatory } = useFilter()
  const { assetView } = useUserPreferences()
  const [queryResult, setQueryResult] = useState<PagedAssets>()
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState<number>(1)
  const newCancelToken = useCancelToken()
  const filtersKey = JSON.stringify(filters || {})
  const supportedChainsKey = JSON.stringify(validatedSupportedChains || [])

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
    if (!accountId || validatedSupportedChains.length === 0) return

    getPublished(
      accountId,
      validatedSupportedChains,
      page,
      filters,
      ignorePurgatory,
      newCancelToken()
    )
  }, [
    accountId,
    ownAccount,
    page,
    supportedChainsKey,
    newCancelToken,
    getPublished,
    filtersKey,
    ignorePurgatory
  ])

  return accountId ? (
    <div className={styles.container}>
      <div className={styles.filterContainer}>
        <Filter showPurgatoryOption={ownAccount} expanded />
      </div>
      <div className={styles.results}>
        <AssetList
          assets={queryResult?.results}
          isLoading={isLoading}
          showPagination
          page={queryResult?.page > 1 ? queryResult?.page - 1 : 1}
          totalPages={queryResult?.totalPages}
          onPageChange={(newPage) => {
            setIsLoading(true)
            setPage(newPage)
          }}
          noPublisher
          defaultAssetView={assetView}
          skeletonCount={9}
        />
      </div>
    </div>
  ) : (
    <div>Please connect your wallet.</div>
  )
}
