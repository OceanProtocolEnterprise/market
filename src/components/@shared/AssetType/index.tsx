import { ReactElement } from 'react'
import styles from './index.module.css'
import { ComputeIcon, DownloadIcon, LockIcon } from '../Icons'

export default function AssetType({
  type,
  accessType,
  className
}: {
  type: string
  accessType: string
  className?: string
}): ReactElement {
  return (
    <div className={className || null}>
      {accessType === 'access' ? (
        <DownloadIcon
          role="img"
          aria-label="Download"
          className={styles.icon}
        />
      ) : accessType === 'compute' && type === 'algorithm' ? (
        <LockIcon role="img" aria-label="Private" className={styles.icon} />
      ) : (
        <ComputeIcon role="img" aria-label="Compute" className={styles.icon} />
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
