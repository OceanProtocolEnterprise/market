import { useUserPreferences } from '@context/UserPreferences'
import Link from 'next/link'
import {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import Table from '@shared/atoms/Table'
import { LoggerInstance } from '@oceanprotocol/lib'
import { getAssetsFromDids } from '@utils/aquarius'
import { useCancelToken } from '@hooks/useCancelToken'
import { useMarketMetadata } from '@context/MarketMetadata'
import { AssetExtended } from 'src/@types/AssetExtended'
import Pagination from '@shared/Pagination'
import DeleteButton from '@shared/DeleteButton/DeleteButton'
import ExpandIcon from '@images/expand.svg'
import MinimizeIcon from '@images/minimize.svg'
import ExpandedServices from './BookmarksTable/ExpandedServices'
import BookmarksSkeleton from './BookmarksTable/Skeleton'
import { buildBookmarkColumns } from './BookmarksTable/columns'
import styles from './Bookmarks.module.css'

const BOOKMARKS_PAGE_SIZE = 10

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export default function Bookmarks(): ReactElement {
  const { appConfig } = useMarketMetadata()
  const { bookmarks, removeBookmark, removeBookmarks, chainIds } =
    useUserPreferences()

  const [pinned, setPinned] = useState<AssetExtended[]>()
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [selectedRows, setSelectedRows] = useState<AssetExtended[]>([])
  const [clearSelected, setClearSelected] = useState(false)
  const newCancelToken = useCancelToken()

  const pinnedRef = useRef<AssetExtended[]>()
  pinnedRef.current = pinned

  const handleRemove = useCallback(
    (did: string) => {
      setPinned((prev) => prev?.filter((asset) => asset.id !== did))
      setSelectedRows((prev) => prev.filter((asset) => asset.id !== did))
      removeBookmark(did)
    },
    [removeBookmark]
  )

  const handleSelectedChange = useCallback(
    ({ selectedRows }: { selectedRows: AssetExtended[] }) => {
      setSelectedRows(selectedRows)
    },
    []
  )

  const handleRemoveSelected = useCallback(() => {
    const dids = selectedRows.map((row) => row.id)
    if (!dids.length) return
    setPinned((prev) => prev?.filter((asset) => !dids.includes(asset.id)))
    removeBookmarks(dids)
    setSelectedRows([])
    setClearSelected((prev) => !prev)
  }, [selectedRows, removeBookmarks])

  const columns = useMemo(
    () => buildBookmarkColumns(handleRemove),
    [handleRemove]
  )

  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = Math.max(
    1,
    Math.ceil((pinned?.length || 0) / BOOKMARKS_PAGE_SIZE)
  )
  const page = Math.min(currentPage, totalPages)

  useEffect(() => {
    if (page !== currentPage) setCurrentPage(page)
  }, [page, currentPage])

  const paginatedData = pinned?.slice(
    (page - 1) * BOOKMARKS_PAGE_SIZE,
    page * BOOKMARKS_PAGE_SIZE
  )

  useEffect(() => {
    if (!appConfig?.metadataCacheUri) return

    async function init() {
      if (!bookmarks?.length) {
        setPinned([])
        setIsLoading(false)
        return
      }

      if (pinnedRef.current === undefined) setIsLoading(true)

      try {
        const result = await getAssetsFromDids(
          bookmarks,
          chainIds,
          newCancelToken()
        )

        if (!result) {
          if (pinnedRef.current === undefined) setPinned([])
          return
        }

        if (result.length === 0) {
          setPinned([])
          return
        }

        const reversed = [...bookmarks].reverse()
        const sorted = [...result].sort(
          (a, b) => reversed.indexOf(a.id) - reversed.indexOf(b.id)
        )
        setPinned(sorted)
      } catch (error) {
        LoggerInstance.error('Bookmarks error:', getErrorMessage(error))
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [appConfig?.metadataCacheUri, bookmarks, chainIds, newCancelToken])

  return (
    <>
      <div className={styles.bookmarks}>
        {selectedRows.length > 0 && (
          <div className={styles.bulkBar}>
            <span className={styles.bulkCount}>
              {selectedRows.length} selected
            </span>
            <DeleteButton text="Remove" onClick={handleRemoveSelected} />
          </div>
        )}
        {isLoading && !pinned ? (
          <BookmarksSkeleton />
        ) : (
          <Table
            columns={columns}
            data={paginatedData}
            isLoading={isLoading}
            emptyMessage={
              chainIds.length === 0 ? (
                'No network selected'
              ) : (
                <>
                  Your bookmarks will appear here. Go to the{' '}
                  <Link href="/search?sort=indexedMetadata.event.block&sortOrder=desc">
                    catalogue
                  </Link>{' '}
                  and save your favourite assets by clicking the bookmark icon
                  on the asset card or from the asset details page.
                </>
              )
            }
            selectableRows
            selectableRowsHighlight
            clearSelectedRows={clearSelected}
            onSelectedRowsChange={handleSelectedChange}
            expandableRows
            expandableRowsComponent={ExpandedServices}
            expandableRowDisabled={(row) =>
              !row.credentialSubject?.services?.length
            }
            expandableIcon={{
              collapsed: <ExpandIcon className={styles.expanderIcon} />,
              expanded: <MinimizeIcon className={styles.expanderIcon} />
            }}
            dense
          />
        )}
      </div>
      {totalPages > 1 && (
        <Pagination
          totalPages={totalPages}
          currentPage={page}
          onChangePage={(selected) => setCurrentPage(selected + 1)}
        />
      )}
    </>
  )
}
