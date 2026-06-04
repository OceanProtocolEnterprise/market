import { ReactElement } from 'react'
import AssetTeaserSkeleton from '@shared/AssetTeaser/Skeleton'
import Skeleton from '@shared/atoms/Skeleton'
import styles from './index.module.css'

type AssetListSkeletonProps = {
  count?: number
  noPublisher?: boolean
  noDescription?: boolean
}

export default function AssetListSkeleton({
  count = 21,
  noPublisher,
  noDescription
}: AssetListSkeletonProps): ReactElement {
  const skeletonCount = Math.max(0, Math.floor(count))

  return (
    <div className={styles.assetList} aria-hidden="true">
      {Array.from({ length: skeletonCount }).map((_, i) => (
        <AssetTeaserSkeleton
          key={i}
          noPublisher={noPublisher}
          noDescription={noDescription}
        />
      ))}
    </div>
  )
}

const TABLE_ROWS = 12
const tableHeaderWidths = ['55%', '60%', '65%', '45%', '50%', '60%']
const tableCellWidths = [
  ['80%', '70%', '75%', '55%', '50%', '70%'],
  ['65%', '55%', '80%', '65%', '40%', '55%'],
  ['75%', '65%', '70%', '70%', '55%', '65%'],
  ['85%', '70%', '65%', '50%', '45%', '75%'],
  ['70%', '60%', '75%', '60%', '50%', '60%'],
  ['60%', '75%', '80%', '55%', '40%', '70%'],
  ['80%', '55%', '70%', '65%', '55%', '55%'],
  ['70%', '65%', '65%', '50%', '45%', '65%'],
  ['75%', '70%', '75%', '60%', '50%', '70%'],
  ['65%', '60%', '70%', '55%', '40%', '60%'],
  ['80%', '65%', '65%', '70%', '55%', '55%'],
  ['70%', '75%', '80%', '60%', '45%', '65%']
]

export function AssetListTableSkeleton(): ReactElement {
  return (
    <div className={styles.tableSkeletonWrapper} aria-hidden="true">
      <div
        className={`${styles.tableSkeletonRow} ${styles.tableSkeletonHeaderRow}`}
      >
        {tableHeaderWidths.map((w, i) => (
          <Skeleton key={i} width={w} height="0.6rem" />
        ))}
      </div>
      {Array.from({ length: TABLE_ROWS }).map((_, row) => (
        <div key={row} className={styles.tableSkeletonRow}>
          {tableCellWidths[row].map((w, col) => (
            <Skeleton key={col} width={w} height="0.85rem" />
          ))}
        </div>
      ))}
    </div>
  )
}
