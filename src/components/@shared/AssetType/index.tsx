import { ReactElement } from 'react'
import cs from 'classnames'
import styles from './index.module.css'
import Compute from '@images/compute.svg'
import Download from '@images/download.svg'
import Lock from '@images/lock.svg'
import Dataset from '@images/dataset.svg'
import Algorithm from '@images/algorithm.svg'

export default function AssetType({
  type,
  accessType,
  variant = 'access',
  showIcon = true,
  className
}: {
  type: string
  accessType?: string
  variant?: 'access' | 'metadata'
  showIcon?: boolean
  className?: string
}): ReactElement {
  const isDataset = type === 'dataset'

  if (variant === 'metadata') {
    return (
      <div className={cs(styles.wrapper, className || null)}>
        {showIcon &&
          (isDataset ? (
            <Dataset role="img" aria-label="Dataset" className={styles.icon} />
          ) : (
            <Algorithm
              role="img"
              aria-label="Algorithm"
              className={`${styles.icon} ${styles.algorithmIcon}`}
            />
          ))}
        <div className={`${styles.typeLabel} ${styles.metadataTypeLabel}`}>
          {isDataset ? 'dataset' : 'algorithm'}
        </div>
      </div>
    )
  }

  return (
    <div className={cs(styles.wrapper, className || null)}>
      {accessType === 'access' ? (
        <Download role="img" aria-label="Download" className={styles.icon} />
      ) : accessType === 'compute' && type === 'algorithm' ? (
        <Lock role="img" aria-label="Private" className={styles.icon} />
      ) : (
        <Compute role="img" aria-label="Compute" className={styles.icon} />
      )}
      <div className={styles.accessLabel}>
        {accessType === 'access' ? 'download' : 'compute'}
      </div>
      <div className={styles.typeLabel}>
        {type === 'dataset' ? 'dataset' : 'algorithm'}
      </div>
    </div>
  )
}
