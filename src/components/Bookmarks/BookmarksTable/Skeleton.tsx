import { ReactElement } from 'react'
import Skeleton from '@shared/atoms/Skeleton'
import styles from '../Bookmarks.module.css'

const SKELETON_ROWS = 10

export default function BookmarksSkeleton(): ReactElement {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <div className={`${styles.skeletonRow} ${styles.skeletonHeaderRow}`}>
        <Skeleton width="18px" height="18px" />
        <span />
        <Skeleton width="70%" height="0.7rem" />
        <Skeleton width="70%" height="0.7rem" />
        <Skeleton width="70%" height="0.7rem" />
        <Skeleton width="70%" height="0.7rem" />
        <Skeleton width="70%" height="0.7rem" />
        <span />
      </div>
      {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <div className={styles.skeletonRow} key={`bookmark-skeleton-${i}`}>
          <Skeleton width="18px" height="18px" />
          <span />
          <Skeleton height="1rem" />
          <Skeleton height="1rem" />
          <Skeleton height="1rem" />
          <Skeleton height="1rem" />
          <Skeleton height="1rem" />
          <Skeleton width="18px" height="18px" />
        </div>
      ))}
    </div>
  )
}
