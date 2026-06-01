import { ReactElement, useState, useEffect, useCallback } from 'react'
import AssetList from '@shared/AssetList'
import queryString from 'query-string'
import Filter from './Filter'
import Sort from './sort'
import { buildSearchPageUrl, getResults } from './utils'
import { useCancelToken } from '@hooks/useCancelToken'
import styles from './index.module.css'
import { useRouter } from 'next/router'
import { useDebouncedCallback } from 'use-debounce'
import SearchBar from '@components/Header/SearchBar'
import { useMarketMetadata } from '@context/MarketMetadata'
import { useUserPreferences } from '@context/UserPreferences'

export default function SearchPage({
  setTotalResults,
  setTotalPagesNumber
}: {
  setTotalResults: (totalResults: number) => void
  setTotalPagesNumber: (totalPagesNumber: number) => void
}): ReactElement {
  const router = useRouter()
  const [parsed, setParsed] = useState<queryString.ParsedQuery<string>>()
  const { validatedSupportedChains, isValidatingSupportedChains } =
    useMarketMetadata()
  const { assetView } = useUserPreferences()
  const [queryResult, setQueryResult] = useState<PagedAssets>()
  const [loading, setLoading] = useState<boolean>(true)
  const newCancelToken = useCancelToken()

  useEffect(() => {
    if (!router.isReady) return

    const parsed = queryString.parse(location.search, {
      arrayFormat: 'separator'
    })
    setParsed(parsed)
  }, [router.isReady, router.asPath])

  const updatePage = useCallback(
    (page: number) => {
      setLoading(true)
      const newUrl = buildSearchPageUrl(router.pathname, location.search, page)
      return router.push(newUrl)
    },
    [router]
  )

  const fetchAssets = useDebouncedCallback(
    async (parsed: queryString.ParsedQuery<string>, chainIds: number[]) => {
      setLoading(true)
      setTotalResults(undefined)
      const queryResult = await getResults(parsed, chainIds, newCancelToken())
      setQueryResult(queryResult)

      setTotalResults(queryResult?.totalResults || 0)
      setTotalPagesNumber(queryResult?.totalPages || 0)
      setLoading(false)
    },
    500
  )
  useEffect(() => {
    if (!parsed || !queryResult) return
    const { page } = parsed
    if (queryResult.totalPages < Number(page)) updatePage(1)
  }, [parsed, queryResult, updatePage])

  useEffect(() => {
    if (
      !parsed ||
      isValidatingSupportedChains ||
      validatedSupportedChains.length === 0
    )
      return

    fetchAssets(parsed, validatedSupportedChains)
  }, [
    parsed,
    validatedSupportedChains,
    fetchAssets,
    isValidatingSupportedChains
  ])

  return (
    <div className={styles.container}>
      <div className={styles.filterContainer}>
        <Filter addFiltersToUrl expanded />
        <Sort expanded />
      </div>
      <div className={styles.results}>
        <div className={styles.searchContainer}>
          <SearchBar placeholder="Search for service offerings" />
        </div>
        <AssetList
          assets={queryResult?.results}
          showPagination
          isLoading={loading}
          page={queryResult?.page}
          totalPages={queryResult?.totalPages}
          onPageChange={updatePage}
          defaultAssetView={assetView}
        />
      </div>
    </div>
  )
}
