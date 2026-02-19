import { ChangeEvent, ReactElement, useState } from 'react'
import { Field } from 'formik'
import Input from '@shared/FormInput'
import { FileUpload } from '@components/@shared/FileUpload'
import Label from '@components/@shared/FormInput/Label'
import DeleteButton from '@shared/DeleteButton/DeleteButton'
import Tooltip from '@shared/atoms/Tooltip'
import Button from '@shared/atoms/Button'
import InfoIcon from '@images/info.svg'
import content from '../../../../content/publish/form.json'
import { getFieldContent } from '@utils/form'
import { FileItem } from '@utils/fileItem'
import {
  getAdditionalFileLabel,
  hasInvalidAdditionalLicenseFiles,
  getAdditionalLicenseTooltipText,
  LICENSE_UI
} from '@components/Publish/_license'
import {
  AdditionalLicenseSourceType,
  FormAdditionalLicenseFile
} from '@components/Publish/_types'
import styles from './index.module.css'

interface AdditionalLicenseSectionProps {
  fieldPathPrefix: string
  additionalFiles: FormAdditionalLicenseFile[]
  additionalFilesUploading: Record<number, boolean>
  additionalFilesDeleting: Record<number, boolean>
  additionalFileSourceOptions: AdditionalLicenseSourceType[]
  primaryLicenseReady: boolean
  additionalLicenseSubtext: string
  onAdd: () => void
  onDelete: (index: number) => void
  onSourceChange: (
    index: number,
    sourceType: AdditionalLicenseSourceType
  ) => void
  onUpload: (
    index: number,
    fileItem: FileItem,
    onError: () => void
  ) => void | Promise<void>
  onUrlValidate?: (
    index: number,
    url: string,
    isValid: boolean,
    fileData?: unknown
  ) => void
}

interface AdditionalLicenseItemProps {
  fieldPathPrefix: string
  index: number
  additionalFile: FormAdditionalLicenseFile
  isUploading: boolean
  isDeleting: boolean
  additionalFileSourceOptions: AdditionalLicenseSourceType[]
  onDelete: () => void
  onSourceChange: (sourceType: AdditionalLicenseSourceType) => void
  onUpload: (fileItem: FileItem, onError: () => void) => void | Promise<void>
  onUrlValidate?: (url: string, isValid: boolean, fileData?: unknown) => void
}

function AdditionalLicenseItem({
  fieldPathPrefix,
  index,
  additionalFile,
  isUploading,
  isDeleting,
  additionalFileSourceOptions,
  onDelete,
  onSourceChange,
  onUpload,
  onUrlValidate
}: AdditionalLicenseItemProps): ReactElement {
  const [isUrlValidating, setIsUrlValidating] = useState(false)
  const isNameDisabled = isUploading || isUrlValidating
  const fieldNamePrefix = `${fieldPathPrefix}[${index}]`

  return (
    <div className={styles.additionalLicenseItem}>
      <div className={styles.additionalLicenseFieldWrapper}>
        <div className={styles.additionalLicenseFieldHeader}>
          <div className={styles.additionalLicenseTitle}>
            <Label
              htmlFor={`${fieldNamePrefix}.name`}
              className={styles.itemTitleLabel}
            >
              {getAdditionalFileLabel(index)}
            </Label>
            <Tooltip
              content={getAdditionalLicenseTooltipText(
                additionalFile.sourceType
              )}
            >
              <InfoIcon className={styles.infoIcon} />
            </Tooltip>
          </div>
          <DeleteButton
            onClick={onDelete}
            loading={isDeleting}
            loadingText="Deleting..."
            disabled={isDeleting}
          />
        </div>

        <div className={styles.additionalFileSourceWrapper}>
          <Field
            component={Input}
            name={`${fieldNamePrefix}.sourceType`}
            label={LICENSE_UI.sourceLabel}
            type="select"
            options={additionalFileSourceOptions}
            sortOptions={false}
            required
            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
              setIsUrlValidating(false)
              onSourceChange(event.target.value as AdditionalLicenseSourceType)
            }}
          />
        </div>

        <div className={styles.licenseUrlContainer}>
          <Field
            component={Input}
            name={`${fieldNamePrefix}.name`}
            label={LICENSE_UI.fileNameLabel}
            placeholder="e.g. terms.pdf"
            required
            disabled={isNameDisabled}
          />

          {additionalFile.sourceType === 'URL' ? (
            <Field
              {...getFieldContent('license', content.metadata.fields)}
              component={Input}
              name={`${fieldNamePrefix}.url`}
              isAdditionalLicense
              errorClassName={styles.additionalLicenseError}
              onValidationLoadingChange={setIsUrlValidating}
              onValidationComplete={onUrlValidate}
            />
          ) : (
            <div className={styles.fileUploadField}>
              <Label htmlFor={`additional-file-${index}`} noMargin>
                {LICENSE_UI.fileLabel}{' '}
                <span className={styles.required}>*</span>
              </Label>
              <FileUpload
                fileName={additionalFile.uploadedDocument?.name}
                fileSize={
                  additionalFile.uploadedDocument?.additionalInformation
                    ?.size as number | undefined
                }
                fileType={additionalFile.uploadedDocument?.fileType}
                buttonLabel="Upload File"
                setFileItem={onUpload}
                buttonStyle="accent"
                disabled={!!additionalFile.uploadedDocument || isUploading}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdditionalLicenseSection({
  fieldPathPrefix,
  additionalFiles,
  additionalFilesUploading,
  additionalFilesDeleting,
  additionalFileSourceOptions,
  primaryLicenseReady,
  additionalLicenseSubtext,
  onAdd,
  onDelete,
  onSourceChange,
  onUpload,
  onUrlValidate
}: AdditionalLicenseSectionProps): ReactElement | null {
  if (!primaryLicenseReady) return null
  const lastAdditionalFile = additionalFiles[additionalFiles.length - 1]
  const isLastAdditionalFileIncomplete = hasInvalidAdditionalLicenseFiles(
    lastAdditionalFile ? [lastAdditionalFile] : []
  )

  return (
    <div className={styles.root}>
      <div className={styles.additionalLicenseHeader}>
        <Label htmlFor={fieldPathPrefix} className={styles.headerLabel}>
          {LICENSE_UI.additionalFilesHeader}
        </Label>
        <span className={styles.additionalLicenseSubtext}>
          {additionalLicenseSubtext}
        </span>
      </div>

      <div className={styles.items}>
        {additionalFiles.map((additionalFile, index) => (
          <AdditionalLicenseItem
            key={additionalFile.id}
            fieldPathPrefix={fieldPathPrefix}
            index={index}
            additionalFile={additionalFile}
            isUploading={!!additionalFilesUploading[index]}
            isDeleting={!!additionalFilesDeleting[index]}
            additionalFileSourceOptions={additionalFileSourceOptions}
            onDelete={() => onDelete(index)}
            onSourceChange={(sourceType) => onSourceChange(index, sourceType)}
            onUpload={(fileItem, onError) => onUpload(index, fileItem, onError)}
            onUrlValidate={
              onUrlValidate
                ? (url, isValid, fileData) =>
                    onUrlValidate(index, url, isValid, fileData)
                : undefined
            }
          />
        ))}
      </div>

      <div className={styles.additionalFilesButtonWrapper}>
        <Button
          style="ghost"
          type="button"
          onClick={onAdd}
          className={styles.addLicenseButton}
          disabled={!primaryLicenseReady || isLastAdditionalFileIncomplete}
        >
          {LICENSE_UI.addAdditionalFileButton}
        </Button>
      </div>
    </div>
  )
}
