import { ReactElement, useMemo, useState } from 'react'
import { prettySize } from '@shared/FormInput/InputElement/FilesInput/utils'
import { IpfsRemoteSource } from '@components/@shared/IpfsRemoteSource'
import { RemoteObject } from 'src/@types/ddo/RemoteObject'
import cleanupContentType from '@utils/cleanupContentType'
import Badge from '@shared/atoms/Badge'
import ChevronDown from '@images/chevron_down.svg'
import styles from './AdditionalLicenseFiles.module.css'

interface AdditionalLicenseFilesProps {
  licenseDocuments?: RemoteObject[]
}

function getFormattedFileSize(document: RemoteObject): string {
  const rawSize = document.additionalInformation?.size
  const parsedSize =
    typeof rawSize === 'number'
      ? rawSize
      : typeof rawSize === 'string' && rawSize.trim() !== ''
      ? Number(rawSize)
      : NaN

  if (!Number.isFinite(parsedSize) || parsedSize < 0) return 'n/a'
  return prettySize(parsedSize)
}

function getFormattedFileType(
  document: RemoteObject,
  mirrorType?: string
): string {
  if (mirrorType === 'url') return 'URL'
  if (!document.fileType) return 'n/a'
  return cleanupContentType(document.fileType) || document.fileType
}

function getFileTypePillLabel(fileType: string): string {
  if (!fileType || fileType === 'n/a') return 'FILE'
  return fileType.toUpperCase()
}

function getDocumentKey(document: RemoteObject, index: number): string {
  const primaryMirror = document.mirrors?.[0]
  return `${document.sha256 || document.name || 'license-document'}-${
    primaryMirror?.url || primaryMirror?.ipfsCid || index
  }-${index}`
}

export default function AdditionalLicenseFiles({
  licenseDocuments = []
}: AdditionalLicenseFilesProps): ReactElement | null {
  const [isExpanded, setIsExpanded] = useState(false)
  const additionalLicenseDocuments = useMemo(
    () => licenseDocuments.slice(1),
    [licenseDocuments]
  )

  if (additionalLicenseDocuments.length === 0) return null

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={`${styles.toggleButton} ${
          isExpanded ? styles.toggleButtonExpanded : ''
        }`}
        onClick={() => setIsExpanded((current) => !current)}
      >
        <span className={styles.toggleText}>
          {isExpanded ? 'Hide additional files' : 'Show additional files'} (
          {additionalLicenseDocuments.length})
        </span>
        <ChevronDown className={styles.chevron} aria-hidden="true" />
      </button>

      {isExpanded && (
        <div className={styles.panel}>
          <ul className={styles.list}>
            {additionalLicenseDocuments.map((document, index) => {
              const primaryMirror = document.mirrors?.[0]
              const documentLabel =
                document.name || primaryMirror?.url || 'License document'
              const fileSize = getFormattedFileSize(document)
              const fileType = getFormattedFileType(
                document,
                primaryMirror?.type
              )
              const fileTypePillLabel = getFileTypePillLabel(fileType)

              return (
                <li
                  className={styles.item}
                  key={getDocumentKey(document, index)}
                >
                  <div className={styles.documentMain}>
                    {primaryMirror?.type === 'url' && primaryMirror?.url ? (
                      <a
                        href={primaryMirror.url}
                        target="_blank"
                        rel="noreferrer"
                        title={primaryMirror.url}
                        className={styles.documentLink}
                      >
                        {documentLabel}
                      </a>
                    ) : (
                      <IpfsRemoteSource
                        remoteSource={primaryMirror}
                        name={documentLabel}
                        noDocumentLabel={documentLabel}
                        className={styles.documentLink}
                      />
                    )}
                  </div>

                  <div className={styles.documentMeta}>
                    <span className={styles.fileSize}>{fileSize}</span>
                    <Badge
                      label={fileTypePillLabel}
                      className={styles.fileTypePill}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
