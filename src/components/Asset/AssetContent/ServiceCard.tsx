import { ReactElement, useState } from 'react'
import styles from './ServiceCard.module.css'
import { Service } from 'src/@types/ddo/Service'
import ServiceTypeIcon from '@shared/ServiceTypeIcon'
import { formatServiceTimeout } from '@utils/ddo'
import { assetStateToString, isAssetOrderableState } from '@utils/assetState'
import { State } from 'src/@types/ddo/State'

export default function ServiceCard({
  service,
  accessDetails,
  onClick,
  isClickable
}: {
  service: Service
  accessDetails: AccessDetails
  onClick: () => void
  isClickable?: boolean
}): ReactElement {
  const [expanded, setExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  if (!accessDetails) return null
  const clickable =
    (isClickable ?? true) && isAssetOrderableState(service.state)
  const description = service.description?.['@value']
  const stateLabel =
    service.state === State.EndOfLife
      ? 'End of life'
      : service.state === State.OrderingIsTemporaryDisabled
      ? 'Ordering temporarily disabled'
      : assetStateToString(service.state) || 'Unknown'
  const disabledMessage =
    service.state === State.EndOfLife
      ? 'This service has reached its end of life and cannot be ordered.'
      : service.state === State.OrderingIsTemporaryDisabled
      ? 'Ordering is temporarily disabled for this service. Please try again later.'
      : undefined

  return (
    <div
      aria-disabled={!clickable}
      onClick={(e) => {
        if (!clickable) {
          e.preventDefault()
          e.stopPropagation()
          return
        }
        onClick()
      }}
      className={`${styles.service} ${!clickable ? styles.disabled : ''}`}
      onMouseEnter={() => clickable && setIsHovered(true)}
      onMouseLeave={() => clickable && setIsHovered(false)}
      style={{
        cursor: clickable ? 'pointer' : 'not-allowed',
        opacity: clickable ? 1 : 0.5
      }}
    >
      <span className={styles.serviceTitle}>{service.name || 'Unknown'} </span>
      <br />
      <div className={styles.descriptionWrapper}>
        <span className={styles.title}>Description: </span>
        {description ? (
          <>
            <span
              className={`${styles.serviceDescription} ${
                expanded ? styles.expanded : styles.collapsed
              }`}
            >
              {description}
            </span>
            {description.length > 50 && (
              <button
                type="button"
                className={styles.toggle}
                disabled={!clickable}
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  if (!clickable) return
                  setExpanded((prev) => !prev)
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </>
        ) : (
          <span className={styles.serviceDescriptionPlaceholder}>
            No description available.
          </span>
        )}
      </div>
      <span className={styles.title}>State: </span>
      <span>{stateLabel}</span>
      <br />
      <div className={styles.typeRow}>
        <span className={styles.title}>Type: </span>
        <span className={styles.access}>
          <ServiceTypeIcon type={service.type} className={styles.typeIcon} />
          {service.type}
        </span>
      </div>
      <span className={styles.title}>Timeout: </span>
      <span>{formatServiceTimeout(service.timeout)}</span>
      <br />
      <span className={styles.title}>Price: </span>
      {accessDetails.type === 'fixed' ? (
        <>
          {accessDetails.price}{' '}
          <span className={styles.tokenSymbol}>
            {accessDetails.baseToken.symbol}
          </span>
        </>
      ) : (
        <span className={styles.free}>free</span>
      )}
      <br />
      {disabledMessage && (
        <p className={styles.disabledMessage}>{disabledMessage}</p>
      )}
      <div
        className={`${styles.selectButtonWrapper} ${
          isHovered ? styles.visible : ''
        }`}
      >
        <button
          type="button"
          className={styles.selectButton}
          disabled={!clickable}
          style={{
            cursor: clickable ? 'pointer' : 'not-allowed'
          }}
        >
          Select
        </button>
      </div>
    </div>
  )
}
