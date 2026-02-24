import { useEffect, useState } from 'react'
import { ProviderInstance } from '@oceanprotocol/lib'
import Modal from '@shared/atoms/Modal'
import styles from './index.module.css'

type OwnerInfoEntry = {
  type?: string
  value?: string
}

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[]

type JsonObject = {
  [key: string]: JsonValue
}

type ProviderEndpointsResponse = {
  ownerInfo?: JsonObject
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
  const mergedClassName = [styles.modalContent, className]
    .filter(Boolean)
    .join(' ')

  const [ownerInfo, setOwnerInfo] = useState<JsonObject>()
  const [isOwnerInfoLoading, setIsOwnerInfoLoading] = useState(false)

  const formatLabel = (key: string): string =>
    key
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())

  const isLegacyEntry = (entry: unknown): entry is OwnerInfoEntry => {
    if (!entry || typeof entry !== 'object') return false
    return 'type' in entry || 'value' in entry
  }

  const isOwnerInfoSection = (entry: unknown): entry is JsonObject =>
    Boolean(entry && typeof entry === 'object' && !isLegacyEntry(entry))

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
        if (!cancelled) {
          setOwnerInfo(endpoints?.ownerInfo || {})
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
      className={mergedClassName}
    >
      <div className={styles.scrollArea}>
        {providerUrl && (
          <div className={styles.providerUrlCard}>
            <div className={styles.providerUrlLabel}>NODE URL</div>
            <div className={styles.providerUrlValue}>{providerUrl}</div>
          </div>
        )}

        {isOwnerInfoLoading ? (
          <p className={styles.modalDescription}>Loading owner info...</p>
        ) : ownerInfo && Object.keys(ownerInfo).length > 0 ? (
          <div className={styles.ownerInfoList}>
            {Object.entries(ownerInfo).map(([key, rawEntry]) => {
              if (isLegacyEntry(rawEntry)) {
                return (
                  <div key={key} className={styles.ownerInfoItem}>
                    <span className={styles.ownerInfoKey}>
                      {formatLabel(key)}:{' '}
                    </span>
                    {rawEntry?.type === 'url' ? (
                      <a
                        href={rawEntry.value}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.ownerInfoLink}
                      >
                        {rawEntry.value}
                      </a>
                    ) : (
                      <span className={styles.ownerInfoValue}>
                        {rawEntry?.value || '-'}
                      </span>
                    )}
                  </div>
                )
              }

              if (!isOwnerInfoSection(rawEntry)) return null

              return (
                <div key={key} className={styles.ownerInfoSection}>
                  <div className={styles.ownerInfoSectionTitle}>
                    {formatLabel(key)}
                  </div>
                  <div className={styles.ownerInfoSectionBody}>
                    {Object.entries(rawEntry).map(
                      ([sectionField, sectionValue]) => {
                        const stringValue =
                          typeof sectionValue === 'string'
                            ? sectionValue
                            : String(sectionValue || '')
                        const isUrlField = sectionField.toLowerCase() === 'url'

                        return (
                          <div
                            key={`${key}-${sectionField}`}
                            className={styles.ownerInfoItem}
                          >
                            <span className={styles.ownerInfoKey}>
                              {formatLabel(sectionField)}:{' '}
                            </span>
                            {isUrlField ? (
                              <a
                                href={stringValue}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.ownerInfoLink}
                              >
                                {stringValue}
                              </a>
                            ) : (
                              <span className={styles.ownerInfoValue}>
                                {stringValue || '-'}
                              </span>
                            )}
                          </div>
                        )
                      }
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className={styles.modalDescription}>No owner info available.</p>
        )}
      </div>
    </Modal>
  )
}
