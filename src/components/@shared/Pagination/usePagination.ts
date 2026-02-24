import { useState, useMemo, useEffect, useCallback } from 'react'
import { MAXIMUM_NUMBER_OF_PAGES_WITH_RESULTS } from '@utils/aquarius'
import { PaginationProps } from './_types'

export interface UsePaginationResult {
  changePage: (page: number) => void
  displayedPageCount: number
  isFirstPage: boolean
  isLastPage: boolean
  selectedPage: number
  shouldRenderPagination: boolean
  smallViewport: boolean
}

export default function usePagination({
  totalPages,
  currentPage,
  rowsPerPage,
  rowCount,
  onChangePage
}: PaginationProps): UsePaginationResult {
  const [smallViewport, setSmallViewport] = useState(true)
  const [uncontrolledSelectedPage, setUncontrolledSelectedPage] = useState(0)

  const isControlled = typeof currentPage === 'number' && currentPage > 0
  const rawSelectedPage = isControlled
    ? currentPage - 1
    : uncontrolledSelectedPage

  const totalPageNumbers = useMemo(() => {
    if (typeof totalPages === 'number' && totalPages > 0) return totalPages

    if (
      typeof rowCount !== 'number' ||
      typeof rowsPerPage !== 'number' ||
      rowsPerPage <= 0
    ) {
      return undefined
    }

    return Math.ceil(rowCount / rowsPerPage)
  }, [rowCount, rowsPerPage, totalPages])

  const displayedPageCount =
    totalPageNumbers > MAXIMUM_NUMBER_OF_PAGES_WITH_RESULTS
      ? MAXIMUM_NUMBER_OF_PAGES_WITH_RESULTS
      : totalPageNumbers || 0
  const maxSelectedPage = Math.max(displayedPageCount - 1, 0)
  const selectedPage = Math.max(0, Math.min(rawSelectedPage, maxSelectedPage))

  const notifyPageChange = useCallback(
    (page: number) => {
      if (!onChangePage) return
      totalPages ? onChangePage(page) : onChangePage(page + 1)
    },
    [onChangePage, totalPages]
  )

  const changePage = useCallback(
    (page: number) => {
      if (!displayedPageCount) return

      const clampedPage = Math.max(0, Math.min(page, displayedPageCount - 1))
      if (clampedPage === selectedPage) return

      if (!isControlled) setUncontrolledSelectedPage(clampedPage)
      notifyPageChange(clampedPage)
    },
    [displayedPageCount, isControlled, notifyPageChange, selectedPage]
  )

  useEffect(() => {
    if (isControlled || !displayedPageCount) return
    if (uncontrolledSelectedPage > displayedPageCount - 1) {
      setUncontrolledSelectedPage(displayedPageCount - 1)
    }
  }, [displayedPageCount, isControlled, uncontrolledSelectedPage])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 600px)')
    const viewportChange = (mediaQuery: { matches: boolean }) => {
      setSmallViewport(!mediaQuery.matches)
    }

    viewportChange(mediaQuery)
    mediaQuery.addEventListener('change', viewportChange)

    return () => {
      mediaQuery.removeEventListener('change', viewportChange)
    }
  }, [])

  return {
    changePage,
    displayedPageCount,
    isFirstPage: selectedPage <= 0,
    isLastPage:
      displayedPageCount > 0 && selectedPage >= displayedPageCount - 1,
    selectedPage,
    shouldRenderPagination: Boolean(totalPageNumbers && totalPageNumbers > 1),
    smallViewport
  }
}
