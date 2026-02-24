import { ReactElement } from 'react'
import { FileItem } from '@utils/fileItem'
import styles from './index.module.css'
import Button from '@shared/atoms/Button'
import Loader from '@shared/atoms/Loader'
import CircleCheckIcon from '@images/circle_check.svg'
import DeleteButton from '@shared/DeleteButton/DeleteButton'
import useFileUpload from './useFileUpload'

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
  const {
    fileInputRef,
    currentFileName,
    hasUploadedFile,
    confirmedSize,
    confirmedType,
    isUploading,
    isResetting,
    handleChange,
    handleButtonClick,
    handleResetClick
  } = useFileUpload({
    fileName,
    fileSize,
    fileType,
    disabled,
    onReset,
    setFileItem
  })

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
