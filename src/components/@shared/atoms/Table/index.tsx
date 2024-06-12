import { ReactElement } from 'react'
import DataTable, { TableProps, TableColumn } from 'react-data-table-component'
import Loader from '../Loader'
import Pagination from '@shared/Pagination'
import { PaginationComponent } from 'react-data-table-component/dist/src/DataTable/types'
import Empty from './Empty'
import { customStyles } from './_styles'
import useNetworkMetadata, {
  getNetworkDataById,
  getNetworkDisplayName
} from '@hooks/useNetworkMetadata'
import Button from '../Button'

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
}

export default function Table({
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
  ...props
}: TableOceanProps<any>): ReactElement {
  const { networksList } = useNetworkMetadata()

  const handleExport = () => {
    const csvRows = []

    // Get the headers
    const headers = columns.map((col) => col.name)
    csvRows.push(headers.join(','))

    data.forEach((asset) => {
      const values = columns.map((col) => {
        const value = col.selector(asset)

        // Handle specific columns rendering logic
        if (col.name === 'Dataset') {
          return asset.metadata?.name
        } else if (col.name === 'Network') {
          const networkData = getNetworkDataById(networksList, asset.chainId)
          return getNetworkDisplayName(networkData)
        } else if (col.name === 'Time') {
          return new Date(asset.event.datetime).toLocaleString()
        } else if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value)
        }
        return value
      })

      const escapedValues = values.map((val) => {
        if (typeof val === 'string' && val.includes(',')) {
          return `"${val.replace(/"/g, '""')}"`
        }
        return val
      })

      csvRows.push(escapedValues.join(','))
    })

    // Create a CSV string
    const csvString = csvRows.join('\n')
    const blob = new Blob([csvString], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('hidden', '')
    a.setAttribute('href', url)
    a.setAttribute('download', 'historyData.csv')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
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
      {exportEnabled && (
        <div style={{ marginTop: '2%' }}>
          <Button onClick={handleExport} style="primary">
            Export to CSV
          </Button>
        </div>
      )}
    </div>
  )
}
