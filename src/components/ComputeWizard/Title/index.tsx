import { ReactElement } from 'react'
import styles from './index.module.css'
import { ComputeFlow } from '../_types'
import { AssetExtended } from 'src/@types/AssetExtended'
import { Service } from 'src/@types/ddo/Service'

interface TitleProps {
  flow: ComputeFlow
  asset: AssetExtended
  service: Service
}

const titleCopy: Record<ComputeFlow, string> = {
  dataset: 'Buy Compute Job',
  algorithm: 'Buy Compute Job'
}

export default function Title({
  flow,
  asset,
  service
}: TitleProps): ReactElement {
  const assetTitle = `${asset.credentialSubject.metadata.name} - ${service.name}`

  return (
    <div className={styles.titleContainer}>
      <span className={styles.titleText}>{titleCopy[flow]}</span>
      <span
        className={`${styles.assetInfo} ${styles.right}`}
        title={assetTitle}
      >
        {assetTitle}
      </span>
    </div>
  )
}
