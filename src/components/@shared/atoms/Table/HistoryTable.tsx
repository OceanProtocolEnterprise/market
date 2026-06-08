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
import { resolveServiceTokenSymbol } from '@utils/priceToken'

// Hack in support for returning components for each row, as this works,
// but is not supported by the typings.
interface TableOceanColumn<T> extends TableColumn<T> {
  selector?: (row: T) => any
}

interface TableOceanProps<T> extends TableProps<T> {
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
  revenueByNetwork?: Record<string, Record<string, number>>
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
  revenueByNetwork,
  revenueTotal,
  sales,
  items,
  allResults,
  ...props
}: TableOceanProps<any>): ReactElement {
  const { networksList } = useNetworkMetadata()
  const revenueEntries = Object.entries(revenueByToken || {})
    .filter(
      ([symbol, amount]) =>
        !!symbol && symbol !== 'UNKNOWN' && Number(amount || 0) !== 0
    )
    .sort(([symbolA], [symbolB]) => {
      // Sort with OCEAN first, then alphabetically
      if (symbolA === 'OCEAN') return -1
      if (symbolB === 'OCEAN') return 1
      return symbolA.localeCompare(symbolB)
    })
  const totalRevenueValue =
    revenueTotal ??
    revenueEntries.reduce((acc, [, amount]) => acc + Number(amount || 0), 0)
  const revenueByNetworkEntries = Object.entries(revenueByNetwork || {})
    .map(([chainId, revenue]) => {
      const tokenEntries = Object.entries(revenue || {})
        .filter(
          ([symbol, amount]) =>
            !!symbol && symbol !== 'UNKNOWN' && Number(amount || 0) !== 0
        )
        .sort(([symbolA], [symbolB]) => {
          if (symbolA === 'OCEAN') return -1
          if (symbolB === 'OCEAN') return 1
          return symbolA.localeCompare(symbolB)
        })

      return {
        chainId: Number(chainId),
        networkName: getNetworkDisplayName(
          getNetworkDataById(networksList, Number(chainId))
        ),
        tokenEntries
      }
    })
    .filter(({ tokenEntries }) => tokenEntries.length > 0)
    .sort((a, b) => a.networkName.localeCompare(b.networkName))
  const formattedRevenueByNetwork = revenueByNetworkEntries.reduce<
    Record<string, { chainId: number; revenueByToken: Record<string, number> }>
  >((map, { chainId, networkName, tokenEntries }) => {
    map[networkName] = {
      chainId,
      revenueByToken: tokenEntries.reduce<Record<string, number>>(
        (tokens, [symbol, amount]) => {
          tokens[symbol] = Number(amount || 0)
          return tokens
        },
        {}
      )
    }
    return map
  }, {})
  const revenueChainCounts = revenueByNetworkEntries.reduce<
    Record<string, number>
  >((counts, { tokenEntries }) => {
    tokenEntries.forEach(([symbol]) => {
      counts[symbol] = (counts[symbol] || 0) + 1
    })
    return counts
  }, {})
  const formattedRevenueByToken = revenueByNetworkEntries.reduce<
    Record<string, number>
  >((tokens, { networkName, tokenEntries }) => {
    tokenEntries.forEach(([symbol, amount]) => {
      const key =
        revenueChainCounts[symbol] > 1 ? `${symbol} - ${networkName}` : symbol
      tokens[key] = Number(amount || 0)
    })
    return tokens
  }, {})

  const handleExport = () => {
    interface ServicePriceEntry {
      baseToken?: { symbol?: string }
      price?: number | string
      tokenSymbol?: string
    }

    interface StatsEntry {
      datatokenAddress?: string
      name?: string
      prices?: ServicePriceEntry[]
      orders?: number
      serviceId?: string
      symbol?: string
    }

    const exportData = (allResults || []).map((asset) => {
      const exportedAsset: Record<string, unknown> = {}
      const assetWithAccess = asset as AssetExtended
      const access = assetWithAccess.accessDetails?.[0]
      const assetIdentifier = assetWithAccess.id || ''
      const services = assetWithAccess.credentialSubject?.services || []

      exportedAsset.DID = assetIdentifier
      exportedAsset.NftAddress =
        assetWithAccess.credentialSubject?.nftAddress || ''
      exportedAsset.Time = assetWithAccess.credentialSubject?.metadata?.created
        ? new Date(
            assetWithAccess.credentialSubject.metadata.created
          ).toLocaleString()
        : ''
      if (assetWithAccess.indexedMetadata?.event?.txid) {
        exportedAsset.publishTransactionId =
          assetWithAccess.indexedMetadata.event.txid
      }
      exportedAsset.Services = services.map((service, index) => {
        const serviceStats = assetWithAccess.indexedMetadata?.stats?.find(
          (entry: StatsEntry) =>
            entry.serviceId === service.id ||
            entry.datatokenAddress?.toLowerCase() ===
              service.datatokenAddress?.toLowerCase()
        ) as StatsEntry | undefined
        const serviceAccess =
          assetWithAccess.accessDetails?.[index] ||
          (index === 0 ? access : undefined)
        const servicePriceEntry = serviceStats?.prices?.[0]
        const servicePriceValue = Number(
          serviceAccess?.price ?? servicePriceEntry?.price ?? 0
        )
        const servicePrice = Number.isFinite(servicePriceValue)
          ? servicePriceValue
          : 0
        const serviceOrders = serviceStats?.orders || 0
        const serviceBaseTokenSymbol =
          serviceAccess?.baseToken?.symbol ||
          servicePriceEntry?.baseToken?.symbol ||
          servicePriceEntry?.tokenSymbol ||
          resolveServiceTokenSymbol(
            assetWithAccess,
            index,
            service.id,
            undefined,
            service.datatokenAddress
          ) ||
          ''
        const serviceRevenue = serviceOrders * servicePrice
        const servicePriceDisplay =
          servicePrice === 0
            ? 'Free'
            : serviceBaseTokenSymbol
            ? `${servicePrice} ${serviceBaseTokenSymbol}`
            : servicePrice
        const serviceRevenueDisplay =
          serviceRevenue === 0
            ? 0
            : serviceBaseTokenSymbol
            ? `${serviceRevenue} ${serviceBaseTokenSymbol}`
            : serviceRevenue

        return {
          serviceId: service.id,
          name: service.name || serviceStats?.name || '',
          type: service.type,
          datatokenAddress:
            service.datatokenAddress || serviceStats?.datatokenAddress || '',
          datatokenSymbol:
            serviceAccess?.datatoken?.symbol || serviceStats?.symbol || '',
          sales: serviceOrders,
          price: servicePriceDisplay,
          revenue: serviceRevenueDisplay
        }
      })

      columns.forEach((col) => {
        if (col.name === 'DID') return

        const value = col.selector(asset)

        if (col.name === 'Asset') {
          exportedAsset.Asset = asset.credentialSubject?.metadata?.name
        } else if (col.name === 'Network') {
          const networkData = getNetworkDataById(
            networksList,
            asset.credentialSubject.chainId
          )
          exportedAsset[col.name as string] = getNetworkDisplayName(networkData)
          exportedAsset.chainId = asset.credentialSubject.chainId
        } else if (col.name === 'Transaction ID') {
          exportedAsset[col.name as string] =
            asset.indexedMetadata?.event?.txid || ''
        } else if (col.name === 'Time') {
          exportedAsset[col.name as string] = asset.credentialSubject?.metadata
            ?.created
            ? new Date(
                asset.credentialSubject.metadata.created
              ).toLocaleString()
            : ''
        } else {
          exportedAsset[col.name as string] = value
        }
      })
      return exportedAsset
    })

    const exportObject = {
      asset: exportData,
      totalSales: sales,
      totalPublished: items,
      revenueByToken: formattedRevenueByToken,
      revenueByNetwork: formattedRevenueByNetwork
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
      <div className={styles.tableContent}>
        <DataTable
          columns={columns}
          data={data}
          pagination={!showPagination && (pagination || data?.length >= 9)}
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
      </div>
      {showPagination && !isLoading && (
        <>
          <Pagination
            totalPages={totalPages}
            currentPage={page}
            onChangePage={handlePageChange}
          />
          <div className={styles.totalSummaryRow}>
            <NumberUnit label="Total sales" value={sales} />
            <NumberUnit label="Total published" value={items} />
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
