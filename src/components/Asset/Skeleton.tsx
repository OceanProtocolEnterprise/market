import { ReactElement } from 'react'
import Skeleton from '@shared/atoms/Skeleton'
import AssetListSkeleton from '@shared/AssetList/Skeleton'
import styles from './Skeleton.module.css'

export default function AssetDetailsSkeleton(): ReactElement {
  return (
    <>
      <span className={styles.loadingStatus} role="status" aria-live="polite">
        Loading asset details
      </span>
      <article className={styles.grid} aria-hidden="true">
        <div>
          <div className={styles.metaMenu}>
            <div className={styles.nftPlaceholder} />
            <div className={styles.metaMenuContent}>
              <Skeleton width="10rem" height="0.75rem" />
            </div>
            <div className={styles.bookmarkSlot}>
              <Skeleton width="1.5rem" height="1.5rem" borderRadius="6px" />
            </div>
          </div>

          <div className={styles.content}>
            <div className={styles.publisherInfo}>
              <Skeleton width="5rem" height="1.1rem" borderRadius="20px" />
              <Skeleton width="45%" height="0.75rem" />
            </div>

            <Skeleton
              width="72%"
              height="1.5rem"
              className={styles.assetName}
            />

            <div className={styles.description}>
              <Skeleton height="0.85rem" />
              <Skeleton width="88%" height="0.85rem" />
              <Skeleton width="60%" height="0.85rem" />
            </div>

            <div className={styles.tagsRow}>
              <Skeleton width="4.5rem" height="1.3rem" borderRadius="20px" />
              <Skeleton width="5.5rem" height="1.3rem" borderRadius="20px" />
              <Skeleton width="3.5rem" height="1.3rem" borderRadius="20px" />
            </div>

            <div className={styles.didRow}>
              <Skeleton width="2rem" height="0.6rem" />
              <Skeleton width="16rem" height="0.85rem" />
            </div>

            <div className={styles.metaGrid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={styles.metaItem}>
                  <Skeleton width="3.5rem" height="0.6rem" />
                  <Skeleton width="7rem" height="0.85rem" />
                </div>
              ))}
            </div>

            <div className={styles.licenseRow}>
              <Skeleton width="3.5rem" height="0.6rem" />
              <Skeleton width="11rem" height="0.85rem" />
              <Skeleton width="8rem" height="0.75rem" />
            </div>
          </div>

          <div className={styles.computeJobs}>
            <div className={styles.computeJobsHeader}>
              <Skeleton width="12rem" height="1.2rem" />
              <Skeleton width="5rem" height="1.8rem" borderRadius="20px" />
            </div>
            <div className={styles.computeJobsTable}>
              <div className={styles.computeJobsColumns}>
                <Skeleton width="4rem" height="0.6rem" />
                <Skeleton width="4rem" height="0.6rem" />
                <Skeleton width="4rem" height="0.6rem" />
              </div>
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className={styles.computeJobsRow}>
                  <div className={styles.computeJobsStatusCell}>
                    <Skeleton width="0.85rem" height="0.85rem" circle />
                    <Skeleton width="6rem" height="0.75rem" />
                  </div>
                  <Skeleton width="4rem" height="0.75rem" />
                  <Skeleton width="5rem" height="0.75rem" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <Skeleton width="5rem" height="1.2rem" borderRadius="20px" />

          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className={styles.serviceCard}>
              <Skeleton width="55%" height="1rem" />
              <Skeleton height="0.75rem" />
              <Skeleton width="80%" height="0.75rem" />
              <div className={styles.serviceCardFooter}>
                <Skeleton width="3rem" height="0.75rem" />
                <Skeleton width="4rem" height="0.75rem" />
              </div>
            </div>
          ))}
        </div>
      </article>

      <section className={styles.relatedSection} aria-hidden="true">
        <Skeleton width="10rem" height="1.5rem" />
        <AssetListSkeleton count={6} noDescription noPublisher />
      </section>
    </>
  )
}
