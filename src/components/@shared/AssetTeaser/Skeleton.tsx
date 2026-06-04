import { ReactElement } from 'react'
import Skeleton from '@shared/atoms/Skeleton'
import styles from './Skeleton.module.css'

type AssetTeaserSkeletonProps = {
  noPublisher?: boolean
  noDescription?: boolean
}

export default function AssetTeaserSkeleton({
  noPublisher,
  noDescription
}: AssetTeaserSkeletonProps): ReactElement {
  return (
    <div className={styles.card} aria-hidden="true">
      <Skeleton width="3.5rem" height="0.7rem" />
      <Skeleton width="90%" height="1.1rem" className={styles.titleFirst} />
      <Skeleton width="65%" height="1.1rem" />
      {!noPublisher && <Skeleton width="45%" height="0.7rem" />}
      {!noDescription && (
        <>
          <Skeleton
            width="100%"
            height="0.65rem"
            className={styles.description}
          />
          <Skeleton width="100%" height="0.65rem" />
          <Skeleton width="55%" height="0.65rem" />
        </>
      )}
      <div className={styles.footer}>
        <Skeleton width="3rem" height="0.65rem" />
        <Skeleton width="3.5rem" height="0.65rem" />
      </div>
    </div>
  )
}
