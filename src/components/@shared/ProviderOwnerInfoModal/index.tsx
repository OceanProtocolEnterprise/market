import { useEffect, useState } from 'react'
import { ProviderInstance } from '@oceanprotocol/lib'
import Modal from '@shared/atoms/Modal'
import styles from './index.module.css'

type OwnerInfoEntry = {
  type?: string
  value?: string
}

type ProviderEndpointsResponse = {
  ownerInfo?: Record<string, OwnerInfoEntry>
  onwerInfo?: Record<string, OwnerInfoEntry>
}

export default function ProviderOwnerInfoModal({
  isOpen,
  onClose,
  providerUrl,
  title = 'Provider Info',
  overlayClassName,
  className
}: {
  isOpen: boolean
  onClose: () => void
  providerUrl?: string
  title?: string
  overlayClassName?: string
  className?: string
}): JSX.Element {
  const [ownerInfo, setOwnerInfo] = useState<Record<string, OwnerInfoEntry>>()
  const [isOwnerInfoLoading, setIsOwnerInfoLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false
    async function loadOwnerInfo() {
      setOwnerInfo(undefined)
      setIsOwnerInfoLoading(true)

      if (!providerUrl) {
        console.log(
          '[ProviderOwnerInfoModal] Missing providerUrl. Skipping ProviderInstance.getEndpoints call.'
        )
        if (!cancelled) setIsOwnerInfoLoading(false)
        return
      }

      try {
        const endpoints = (await ProviderInstance.getEndpoints(
          providerUrl
        )) as ProviderEndpointsResponse
        console.log('[ProviderOwnerInfoModal] Provider endpoints:', endpoints)
        if (!cancelled) {
          setOwnerInfo(endpoints?.ownerInfo || endpoints?.onwerInfo || {})
        }
      } catch (error) {
        console.log('[ProviderOwnerInfoModal] Failed to fetch provider info:', {
          providerUrl,
          error
        })
        if (!cancelled) setOwnerInfo({})
      } finally {
        if (!cancelled) setIsOwnerInfoLoading(false)
      }
    }

    loadOwnerInfo()
    return () => {
      cancelled = true
    }
  }, [isOpen, providerUrl])

  return (
    <Modal
      title={title}
      isOpen={isOpen}
      onToggleModal={onClose}
      overlayClassName={overlayClassName}
      className={className}
    >
      {providerUrl && (
        <div className={`${styles.ownerInfoItem} ${styles.providerUrlRow}`}>
          <span className={styles.ownerInfoKey}>Provider URL: </span>
          <span className={styles.ownerInfoValue}>{providerUrl}</span>
        </div>
      )}

      {isOwnerInfoLoading ? (
        <p className={styles.modalDescription}>Loading owner info...</p>
      ) : ownerInfo && Object.keys(ownerInfo).length > 0 ? (
        <div className={styles.ownerInfoList}>
          {Object.entries(ownerInfo).map(([key, entry]) => (
            <div key={key} className={styles.ownerInfoItem}>
              <span className={styles.ownerInfoKey}>{key}: </span>
              {entry?.type === 'url' ? (
                <a
                  href={entry.value}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.ownerInfoLink}
                >
                  {entry.value}
                </a>
              ) : (
                <span className={styles.ownerInfoValue}>
                  {entry?.value || '-'}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.modalDescription}>No owner info available.</p>
      )}
    </Modal>
  )
}
