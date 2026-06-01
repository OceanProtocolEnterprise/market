import { CSSProperties, ReactElement } from 'react'
import Skeleton from '@shared/atoms/Skeleton'
import styles from './Skeleton.module.css'

interface TableSkeletonProps {
  gridTemplateColumns: string
  headerWidths: string[]
  rowWidths: string[][]
  className?: string
  headerHeight?: string
  cellHeight?: string
}

type TableSkeletonStyle = CSSProperties & {
  '--table-skeleton-columns': string
}

export default function TableSkeleton({
  gridTemplateColumns,
  headerWidths,
  rowWidths,
  className,
  headerHeight = '0.6rem',
  cellHeight = '0.85rem'
}: TableSkeletonProps): ReactElement {
  return (
    <div
      className={`${styles.skeletonTable} ${className || ''}`}
      style={
        {
          '--table-skeleton-columns': gridTemplateColumns
        } as TableSkeletonStyle
      }
      aria-hidden="true"
    >
      <div className={`${styles.skeletonRow} ${styles.skeletonHeaderRow}`}>
        {headerWidths.map((width, index) => (
          <Skeleton key={index} width={width} height={headerHeight} />
        ))}
      </div>
      {rowWidths.map((widths, rowIndex) => (
        <div key={rowIndex} className={styles.skeletonRow}>
          {widths.map((width, columnIndex) => (
            <Skeleton key={columnIndex} width={width} height={cellHeight} />
          ))}
        </div>
      ))}
    </div>
  )
}
