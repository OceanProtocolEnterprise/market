import AssetTeaser from '@shared/AssetTeaser'
import { ReactElement } from 'react'
import Link from 'next/link'
import Pagination from '@shared/Pagination'
import Publisher from '@shared/Publisher'
import NetworkName from '@shared/NetworkName'
import AssetType from '@shared/AssetType'
import removeMarkdown from 'remove-markdown'
import styles from './index.module.css'
import Table, { TableOceanColumn } from '../atoms/Table'
import { AssetViewOptions } from 'src/@types/AssetView'
import Time from '../atoms/Time'
import { AssetExtended } from 'src/@types/AssetExtended'
import Alert from '../atoms/Alert'
import AssetListSkeleton, { AssetListTableSkeleton } from './Skeleton'
import { ServiceTypeIcons, ServicesColumnHeader } from './ServiceTypeIcons'

const columns: TableOceanColumn<AssetExtended>[] = [
  {
    name: 'Asset',
    cell: (row) => {
      const name = row.credentialSubject?.metadata?.name
      const owner = row.indexedMetadata?.nft?.owner
      const rawDescription = row.credentialSubject?.metadata?.description
      const description = removeMarkdown(
        rawDescription?.['@value'] ??
          (typeof rawDescription === 'string' ? rawDescription : '')
      )
      return (
        <div className={styles.listDatasetCell}>
          <Link href={`/asset/${row.id}`} className={styles.listAssetName}>
            {name || row.id}
          </Link>
          {owner && (
            <span className={styles.listPublisher}>
              <Publisher account={owner} minimal />
            </span>
          )}
          {description && (
            <span className={styles.listDescription}>{description}</span>
          )}
        </div>
      )
    },
    grow: 2,
    width: '600px'
  },
  {
    name: 'Type',
    cell: (row) => (
      <AssetType
        type={row.credentialSubject?.metadata?.type}
        variant="metadata"
        className={styles.listTypeCell}
      />
    ),
    width: '140px'
  },
  {
    name: <ServicesColumnHeader />,
    cell: (row) => (
      <ServiceTypeIcons services={row.credentialSubject?.services} />
    ),
    width: '120px'
  },
  {
    name: 'Network',
    cell: (row) => (
      <NetworkName
        networkId={row.credentialSubject?.chainId}
        className={styles.listNetworkCell}
      />
    ),
    maxWidth: '9rem'
  },
  {
    name: 'Sales',
    selector: (row) => {
      const orders = row.indexedMetadata?.stats?.[0]?.orders
      return <span>{orders == null || orders < 0 ? '—' : orders}</span>
    },
    maxWidth: '6rem'
  },
  {
    name: 'Published',
    selector: (row) => <Time date={row.indexedMetadata?.nft?.created} />,
    maxWidth: '8rem'
  }
]

declare type AssetListProps = {
  assets: AssetExtended[]
  showPagination: boolean
  page?: number
  totalPages?: number
  isLoading?: boolean
  onPageChange?: React.Dispatch<React.SetStateAction<number>>
  className?: string
  noPublisher?: boolean
  noDescription?: boolean
  noPrice?: boolean
  defaultAssetView?: AssetViewOptions
  skeletonCount?: number
}

export default function AssetList({
  assets,
  showPagination,
  page,
  totalPages,
  isLoading,
  onPageChange,
  className,
  noPublisher,
  noDescription,
  noPrice,
  defaultAssetView,
  skeletonCount = 21
}: AssetListProps): ReactElement {
  const activeAssetView = defaultAssetView || AssetViewOptions.Grid

  // This changes the page field inside the query
  function handlePageChange(selected: number) {
    onPageChange(selected + 1)
  }

  const styleClasses = `${styles.assetList} ${className || ''}`

  if (isLoading) {
    return activeAssetView === AssetViewOptions.List ? (
      <AssetListTableSkeleton />
    ) : (
      <AssetListSkeleton
        count={skeletonCount}
        noPublisher={noPublisher}
        noDescription={noDescription}
      />
    )
  }

  if (!assets?.length || assets[0] === undefined) {
    return <Alert warning>No results found</Alert>
  }

  return (
    <>
      {activeAssetView === AssetViewOptions.List ? (
        <div className={styles.listViewWrapper}>
          <Table
            className={styles.listTable}
            columns={columns}
            data={assets}
            pagination={false}
            paginationPerPage={assets.length}
            dense
          />
          {showPagination && (
            <Pagination
              totalPages={totalPages}
              currentPage={page}
              onChangePage={handlePageChange}
            />
          )}
        </div>
      ) : (
        <>
          <div className={styleClasses}>
            {assets.map((asset) => {
              if (asset?.indexedMetadata && asset?.credentialSubject) {
                return (
                  <AssetTeaser
                    asset={asset}
                    key={asset.id}
                    noPublisher={noPublisher}
                    noDescription={noDescription}
                    noPrice={noPrice}
                  />
                )
              }
              return null
            })}
          </div>
          {showPagination && (
            <Pagination
              totalPages={totalPages}
              currentPage={page}
              onChangePage={handlePageChange}
            />
          )}
        </>
      )}
    </>
  )
}
