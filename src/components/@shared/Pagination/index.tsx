import { ReactElement } from 'react'
import ReactPaginate from 'react-paginate'
import styles from './index.module.css'
import { PaginationProps } from './_types'
import usePagination from './usePagination'

export default function Pagination({
  totalPages,
  currentPage,
  rowsPerPage,
  rowCount,
  onChangePage
}: PaginationProps): ReactElement {
  const {
    changePage,
    displayedPageCount,
    isFirstPage,
    isLastPage,
    selectedPage,
    shouldRenderPagination,
    smallViewport
  } = usePagination({
    currentPage,
    onChangePage,
    rowCount,
    rowsPerPage,
    totalPages
  })

  return shouldRenderPagination ? (
    <div className={styles.paginationWrapper}>
      <button
        type="button"
        className={styles.control}
        onClick={() => changePage(0)}
        disabled={isFirstPage}
        aria-label="First page"
      >
        {'<<'}
      </button>

      <button
        type="button"
        className={styles.control}
        onClick={() => changePage(selectedPage - 1)}
        disabled={isFirstPage}
        aria-label="Previous page"
      >
        {'<'}
      </button>

      <ReactPaginate
        pageCount={displayedPageCount}
        forcePage={selectedPage}
        marginPagesDisplayed={smallViewport ? 0 : 1}
        pageRangeDisplayed={smallViewport ? 2 : 6}
        onPageChange={(data) => changePage(data.selected)}
        disableInitialCallback
        previousLabel={null}
        nextLabel={null}
        breakLabel="..."
        containerClassName={styles.pagination}
        pageLinkClassName={styles.number}
        activeLinkClassName={styles.current}
        previousClassName={styles.hiddenControl}
        nextClassName={styles.hiddenControl}
        breakLinkClassName={styles.break}
      />

      <button
        type="button"
        className={styles.control}
        onClick={() => changePage(selectedPage + 1)}
        disabled={isLastPage}
        aria-label="Next page"
      >
        {'>'}
      </button>

      <button
        type="button"
        className={styles.control}
        onClick={() => changePage(displayedPageCount - 1)}
        disabled={isLastPage}
        aria-label="Last page"
      >
        {'>>'}
      </button>
    </div>
  ) : null
}
