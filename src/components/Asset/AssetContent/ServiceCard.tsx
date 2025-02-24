import { ReactElement } from 'react'
import styles from './ServiceCard.module.css'
import { Service } from '@oceanprotocol/lib'

export default function ServiceCard({
  service,
  accessDetails,
  onClick
}: {
  service: Service
  accessDetails: AccessDetails
  onClick: () => void
}): ReactElement {
  if (!accessDetails) return null
  return (
    <div onClick={onClick} className={styles.service}>
      <span className={styles.title}>Name: </span>
      {service.name || 'Unknown'}
      <br />
      <span className={styles.title}>Description: </span>
      <span>{service.description}</span>
      <br />
      <span className={styles.title}>Type: </span>
      {service.type}
      <br />
      <span className={styles.title}>Price: </span>
      {accessDetails.type === 'fixed'
        ? `${accessDetails.price} ${accessDetails.baseToken.symbol}`
        : '0'}
    </div>
  )
}
