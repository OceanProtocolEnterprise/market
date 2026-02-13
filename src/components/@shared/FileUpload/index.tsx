import { ReactElement, useRef, useState } from 'react'
import { FileItem } from '@utils/fileItem'
import styles from './index.module.css'
import crypto from 'crypto'
import Button from '@shared/atoms/Button'
import Loader from '@shared/atoms/Loader'
import CircleCheckIcon from '@images/circle_check.svg'
import DeleteButton from '@shared/DeleteButton/DeleteButton'
import cleanupContentType from '@utils/cleanupContentType'
import { prettySize } from '@shared/FormInput/InputElement/FilesInput/utils'

export interface FileUploadProps {
  fileName?: string
  fileSize?: number
  fileType?: string
  buttonLabel: string
  setFileItem: (fileItem: FileItem, onError: () => void) => void | Promise<void>
  buttonStyle?: 'default' | 'accent'
  disabled?: boolean
  onReset?: () => void | Promise<void>
}

export function FileUpload({
  buttonLabel,
  setFileItem,
  fileName,
  fileSize,
  fileType,
  buttonStyle = 'default',
  disabled = false,
  onReset
}: FileUploadProps): ReactElement {
  const [uploadFileName, setUploadFileName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [uploadMeta, setUploadMeta] = useState<{
    size?: number
    fileType?: string
  }>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  function inferFileTypeFromName(name?: string): string {
    if (!name || !name.includes('.')) return ''
    return name.split('.').pop()?.toLowerCase() || ''
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    event.preventDefault()

    for (const file of event.target.files) {
      setUploadFileName(file.name)
      setIsUploading(true)
      setUploadMeta({
        size: file.size,
        fileType:
          cleanupContentType(file.type) || inferFileTypeFromName(file.name)
      })

      const reader = new FileReader()

      reader.onloadend = () => {
        const hash = crypto.createHash('sha256')

        let content: string = ''
        if (typeof reader.result === 'string') {
          content = reader.result
        } else {
          const uint8Array = new Uint8Array(reader.result)
          const decoder = new TextDecoder('utf-8')
          content = decoder.decode(uint8Array)
        }
        hash.update(content)

        const newFileItem: FileItem = {
          checksum: hash.digest('hex'),
          content,
          size: file.size,
          name: file.name
        }

        Promise.resolve(
          setFileItem(newFileItem, () => {
            setUploadFileName('')
            setUploadMeta({})
            setIsUploading(false)
          })
        ).finally(() => {
          setIsUploading(false)
        })
      }

      reader.onerror = () => {
        setUploadMeta({})
        setIsUploading(false)
      }

      reader.readAsDataURL(file)
    }
  }

  function fileNameLabel(): string {
    if (uploadFileName) {
      return uploadFileName
    } else if (fileName) {
      return fileName
    } else {
      return ''
    }
  }

  const currentFileName = fileNameLabel()
  const hasUploadedFile = !!fileName && !isUploading
  const resolvedSize = uploadMeta?.size ?? fileSize
  const confirmedSize = resolvedSize ? prettySize(resolvedSize) : ''
  const confirmedType =
    uploadMeta?.fileType ||
    (fileType ? cleanupContentType(fileType) : '') ||
    inferFileTypeFromName(fileName || uploadFileName)

  function handleButtonClick() {
    if (disabled || isUploading || isResetting) return
    fileInputRef.current?.click()
  }

  async function handleResetClick() {
    if (!onReset || isResetting) return
    setIsResetting(true)
    try {
      await onReset()
      setUploadFileName('')
      setUploadMeta({})
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className={styles.fileUpload}>
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      <div className={styles.actionsRow}>
        <Button
          type="button"
          style={buttonStyle === 'default' ? 'primary' : buttonStyle}
          onClick={handleButtonClick}
          className={styles.marginRight2}
          disabled={disabled || isUploading || isResetting}
        >
          {buttonLabel}
        </Button>
        {currentFileName && (
          <div className={styles.fileMeta} title={currentFileName}>
            <div className={styles.fileName}>{currentFileName}</div>
            {(isUploading || hasUploadedFile) && (
              <span className={styles.separator} aria-hidden="true" />
            )}
            {isUploading && (
              <div className={styles.uploadingStatus}>
                <span>Uploading...</span>
                <Loader
                  variant="primary"
                  noMargin
                  className={styles.inlineLoader}
                />
              </div>
            )}
            {hasUploadedFile && (
              <div className={styles.confirmedStatus}>
                <CircleCheckIcon className={styles.successIcon} />
                <span className={styles.confirmedText}>File confirmed</span>
                {confirmedSize && (
                  <span className={styles.confirmedMeta}>{confirmedSize}</span>
                )}
                {confirmedSize && confirmedType && (
                  <span className={styles.confirmedMeta}>•</span>
                )}
                {confirmedType && (
                  <span className={styles.confirmedMeta}>{confirmedType}</span>
                )}
              </div>
            )}
          </div>
        )}
        {hasUploadedFile && onReset && (
          <DeleteButton
            className={styles.deleteAction}
            onClick={handleResetClick}
            disabled={isResetting}
            loading={isResetting}
            loadingText="Deleting..."
          />
        )}
      </div>
    </div>
  )
}
