import { ReactElement } from 'react'
import DataTable, { TableProps, TableColumn } from 'react-data-table-component'
import Loader from '../Loader'
import Pagination from '@shared/Pagination'
import { PaginationComponent } from 'react-data-table-component/dist/DataTable/types'
import Empty from './Empty'
import { customStyles } from './_styles'
import useNetworkMetadata, {
  getNetworkDataById,
  getNetworkDisplayName
} from '@hooks/useNetworkMetadata'
import Button from '../Button'
import styles from './index.module.css'
import NumberUnit from '@components/Profile/Header/NumberUnit'
import { AssetExtended } from 'src/@types/AssetExtended'

// Hack in support for returning components for each row, as this works,
// but is not supported by the typings.
export interface TableOceanColumn<T> extends TableColumn<T> {
  selector?: (row: T) => any
}

export interface TableOceanProps<T> extends TableProps<T> {
  columns: TableOceanColumn<T>[]
  isLoading?: boolean
  emptyMessage?: string
  sortField?: string
  sortAsc?: boolean
  className?: string
  exportEnabled?: boolean
  onPageChange?: React.Dispatch<React.SetStateAction<number>>
  showPagination?: boolean
  page?: number
  totalPages?: number
  revenueByToken?: Record<string, number>
  revenueTotal?: number
  sales: number
  items: number
  allResults?: any[]
}

export default function HistoryTable({
  data,
  columns,
  isLoading,
  emptyMessage,
  exportEnabled,
  pagination,
  paginationPerPage,
  sortField,
  sortAsc,
  className,
  onPageChange,
  showPagination,
  page,
  totalPages,
  revenueByToken,
  revenueTotal,
  sales,
  items,
  allResults,
  ...props
}: TableOceanProps<any>): ReactElement {
  const { networksList } = useNetworkMetadata()
  const revenueEntries = Object.entries(revenueByToken || {}).filter(
    ([symbol]) => !!symbol && symbol !== 'UNKNOWN'
  )
  const totalRevenueValue =
    revenueTotal ??
    revenueEntries.reduce((acc, [_, amount]) => acc + Number(amount || 0), 0)

  const handleExport = () => {
    interface PriceEntry {
      baseToken?: { symbol?: string }
      price?: number | string
    }

    interface StatsEntry {
      prices?: PriceEntry[]
      orders?: number
    }

    const exportData = (allResults || []).map((asset) => {
      const exportedAsset: Record<string, string | number> = {}
      const assetWithAccess = asset as AssetExtended
      const access = assetWithAccess.accessDetails?.[0]
      const statsEntry = assetWithAccess.indexedMetadata?.stats?.[0] as
        | StatsEntry
        | undefined
      const priceEntry = statsEntry?.prices?.[0]

      const baseTokenSymbol =
        access?.baseToken?.symbol || priceEntry?.baseToken?.symbol || undefined

      const accessPrice =
        access?.price && typeof access.price === 'string'
          ? Number(access.price)
          : access?.price
          ? Number(access.price)
          : undefined

      const priceValue =
        accessPrice ??
        (priceEntry?.price
          ? typeof priceEntry.price === 'string'
            ? Number(priceEntry.price)
            : priceEntry.price
          : undefined) ??
        0

      const orders = statsEntry?.orders || 0

      columns.forEach((col) => {
        const value = col.selector(asset)

        if (col.name === 'Dataset') {
          exportedAsset[col.name as string] =
            asset.credentialSubject?.metadata?.name
        } else if (col.name === 'Network') {
          const networkData = getNetworkDataById(
            networksList,
            asset.credentialSubject.chainId
          )
          exportedAsset[col.name as string] = getNetworkDisplayName(networkData)
        } else if (col.name === 'Time') {
          exportedAsset[col.name as string] = new Date(
            asset.indexedMetadata?.event?.datetime
          ).toLocaleString()
        } else if (col.name === 'Price') {
          exportedAsset[col.name as string] = baseTokenSymbol
            ? `${Number(priceValue)} ${baseTokenSymbol}`
            : Number(priceValue)
        } else if (col.name === 'Revenue') {
          const revenueValue = orders * Number(priceValue)
          exportedAsset[col.name as string] = baseTokenSymbol
            ? `${revenueValue} ${baseTokenSymbol}`
            : revenueValue
        } else {
          exportedAsset[col.name as string] = value
        }
      })
      return exportedAsset
    })

    const exportObject = {
      dataset: exportData,
      totalSales: sales,
      totalPublished: items,
      totalRevenue: totalRevenueValue,
      revenueByToken
    }

    const jsonString = JSON.stringify(exportObject, null, 2)

    // Create Blob and download JSON file
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('hidden', '')
    a.setAttribute('href', url)
    a.setAttribute('download', 'historyData.json')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  function handlePageChange(selected: number) {
    onPageChange(selected + 1)
  }

  return (
    <div className={className}>
      <DataTable
        columns={columns}
        data={data}
        pagination={pagination || data?.length >= 9}
        paginationPerPage={paginationPerPage || 10}
        noDataComponent={<Empty message={emptyMessage} />}
        progressPending={isLoading}
        progressComponent={<Loader />}
        paginationComponent={Pagination as unknown as PaginationComponent}
        defaultSortFieldId={sortField}
        defaultSortAsc={sortAsc}
        theme="ocean"
        customStyles={customStyles}
        {...props}
      />
      {showPagination && !isLoading && (
        <>
          <Pagination
            totalPages={totalPages}
            currentPage={page}
            onChangePage={handlePageChange}
          />

          <div className={styles.totalContainer}>
            <NumberUnit label="Total sales" value={sales} />
            <NumberUnit label="Total published" value={items} />
            {revenueEntries.length > 0 &&
              revenueEntries.map(([symbol, amount]) => (
                <NumberUnit
                  key={symbol}
                  label={`Total Revenue ${symbol}`}
                  value={Number(amount || 0)}
                />
              ))}
            {revenueEntries.length === 0 && (
              <NumberUnit
                label="Total Revenue"
                value={Number(totalRevenueValue || 0)}
              />
            )}
          </div>
        </>
      )}
      {exportEnabled && !isLoading && (
        <div className={styles.buttonContainer}>
          <Button onClick={handleExport} style="primary">
            Export data
          </Button>
        </div>
      )}
    </div>
  )
}
