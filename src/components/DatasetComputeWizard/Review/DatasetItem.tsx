import { ReactElement } from 'react'
import Button from '@shared/atoms/Button'
import CircleCheckIcon from '@images/circle_check.svg'
import styles from './DatasetItem.module.css'

export default function DatasetItem({
  dataset,
  onCheckCredentials
}: {
  dataset?: any
  onCheckCredentials: (datasetId: string) => void
}): ReactElement {
  const handleCredentialCheck = () => {
    onCheckCredentials(dataset.id)
  }

  const getCredentialButtonText = () => {
    if (dataset.credentialsStatus === 'valid') {
      return 'Credentials valid for 5 minutes'
    }
    return 'Check Credentials'
  }

  return (
    <div className={styles.datasetItem}>
      <div className={styles.datasetHeader}>
        <span className={styles.datasetName}>{dataset.name}</span>
        {dataset.credentialsStatus === 'valid' ? (
          <div className={styles.credentialStatus}>
            <CircleCheckIcon className={styles.checkIcon} />
            <span className={styles.validText}>
              {getCredentialButtonText()}
            </span>
          </div>
        ) : (
          <Button
            type="button"
            size="small"
            style="slim"
            onClick={handleCredentialCheck}
          >
            {getCredentialButtonText()}
          </Button>
        )}
      </div>
    </div>
  )
}
