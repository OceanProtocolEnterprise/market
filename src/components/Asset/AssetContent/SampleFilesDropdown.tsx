import { ReactElement, useMemo, useState } from 'react'
import { prettySize } from '@shared/FormInput/InputElement/FilesInput/utils'
import { IpfsRemoteSource } from '@components/@shared/IpfsRemoteSource'
import { RemoteObject } from 'src/@types/ddo/RemoteObject'
import { Service } from 'src/@types/ddo/Service'
import cleanupContentType from '@utils/cleanupContentType'
import Badge from '@shared/atoms/Badge'
import ChevronDown from '@images/chevron_down.svg'
import styles from './SampleFilesDropdown.module.css'

interface SampleFile {
  url: string
  name: string
  type: string
  size?: number
  serviceName?: string
  source: 'asset' | 'service'
  serviceIndex?: number
}

interface SampleFilesDropdownProps {
  assetLinks?: Record<string, string>
  services?: Service[]
}

function extractFileNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const { pathname } = urlObj
    const fileName = pathname.split('/').pop()
    return fileName || url
  } catch {
    const parts = url.split('/')
    return parts[parts.length - 1] || url
  }
}

function getFormattedFileSize(size?: number): string {
  if (!size || size < 0) return 'n/a'
  return prettySize(size)
}

function getFormattedFileType(type: string): string {
  if (!type) return 'n/a'
  return cleanupContentType(type) || type
}

function getFileTypePillLabel(fileType: string): string {
  if (!fileType || fileType === 'n/a') return 'FILE'
  return fileType.toUpperCase()
}

export default function SampleFilesDropdown({
  assetLinks,
  services = []
}: SampleFilesDropdownProps): ReactElement | null {
  const [isExpanded, setIsExpanded] = useState(false)

  const sampleFiles = useMemo(() => {
    const files: SampleFile[] = []

    if (assetLinks) {
      Object.entries(assetLinks).forEach(([key, url]) => {
        if (url && typeof url === 'string' && url.trim() !== '') {
          files.push({
            url,
            name: extractFileNameFromUrl(url),
            type: 'url',
            source: 'asset'
          })
        }
      })
    }

    services.forEach((service, index) => {
      if (service.links) {
        Object.entries(service.links).forEach(([key, url]) => {
          if (url && typeof url === 'string' && url.trim() !== '') {
            files.push({
              url,
              name: extractFileNameFromUrl(url),
              type: 'url',
              serviceName: service.name || `Service ${index + 1}`,
              source: 'service',
              serviceIndex: index + 1
            })
          }
        })
      }
    })

    return files
  }, [assetLinks, services])

  const groupedFiles = useMemo(() => {
    const assetFiles = sampleFiles.filter((f) => f.source === 'asset')
    const serviceFiles = sampleFiles.filter((f) => f.source === 'service')

    return {
      assetFiles,
      serviceFiles
    }
  }, [sampleFiles])

  const totalFiles = sampleFiles.length

  if (totalFiles === 0) return null

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
          {isExpanded ? 'Hide sample files' : 'Show sample files'} ({totalFiles}
          )
        </span>
        <ChevronDown className={styles.chevron} aria-hidden="true" />
      </button>

      {isExpanded && (
        <div className={styles.panel}>
          <ul className={styles.list}>
            {groupedFiles.assetFiles.length > 0 && (
              <>
                <li className={styles.groupHeader}>
                  <span className={styles.groupTitle}>Asset Sample Data</span>
                </li>
                {groupedFiles.assetFiles.map((file, index) => (
                  <li
                    className={styles.item}
                    key={`asset-${file.url}-${index}`}
                  >
                    <div className={styles.documentMain}>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        title={file.url}
                        className={styles.documentLink}
                      >
                        {file.name}
                      </a>
                    </div>

                    <div className={styles.documentMeta}>
                      <Badge label="SAMPLE" className={styles.fileTypePill} />
                    </div>
                  </li>
                ))}
              </>
            )}

            {groupedFiles.serviceFiles.length > 0 && (
              <>
                {groupedFiles.assetFiles.length > 0 && (
                  <li className={styles.divider} aria-hidden="true" />
                )}

                {Object.entries(
                  groupedFiles.serviceFiles.reduce((acc, file) => {
                    const key =
                      file.serviceName || `Service ${file.serviceIndex}`
                    if (!acc[key]) acc[key] = []
                    acc[key].push(file)
                    return acc
                  }, {} as Record<string, SampleFile[]>)
                ).map(([serviceName, files]) => (
                  <li key={serviceName} className={styles.serviceGroup}>
                    <div className={styles.groupHeader}>
                      <span className={styles.groupTitle}>
                        {serviceName} Sample Data
                      </span>
                    </div>
                    <ul className={styles.subList}>
                      {files.map((file, index) => (
                        <li
                          className={styles.item}
                          key={`service-${file.serviceIndex}-${file.url}-${index}`}
                        >
                          <div className={styles.documentMain}>
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              title={file.url}
                              className={styles.documentLink}
                            >
                              {file.name}
                            </a>
                          </div>

                          <div className={styles.documentMeta}>
                            <Badge
                              label="SAMPLE"
                              className={styles.fileTypePill}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
