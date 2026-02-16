import { ReactElement, useState } from 'react'
import { Field } from 'formik'
import Input from '@shared/FormInput'
import { FileUpload } from '@components/@shared/FileUpload'
import Label from '@components/@shared/FormInput/Label'
import DeleteButton from '@shared/DeleteButton/DeleteButton'
import Tooltip from '@shared/atoms/Tooltip'
import InfoIcon from '@images/info.svg'
import content from '../../../../content/publish/form.json'
import { getFieldContent } from '@utils/form'
import { FileItem } from '@utils/fileItem'
import {
  getAdditionalFileLabel,
  getAdditionalLicenseTooltipText,
  LICENSE_UI
} from '@components/Publish/_license'
import {
  AdditionalLicenseSourceType,
  FormAdditionalLicenseFile
} from '@components/Publish/_types'
import styles from './index.module.css'

interface EditAdditionalLicenseItemProps {
  index: number
  additionalFile: FormAdditionalLicenseFile
  isUploading: boolean
  isDeleting: boolean
  additionalFileSourceOptions: AdditionalLicenseSourceType[]
  onDelete: () => void
  onSourceChange: (sourceType: AdditionalLicenseSourceType) => void
  onUpload: (fileItem: FileItem, onError: () => void) => void | Promise<void>
  onUrlValidate?: (url: string, isValid: boolean, fileData?: any) => void
}

export default function EditAdditionalLicenseItem({
  index,
  additionalFile,
  isUploading,
  isDeleting,
  additionalFileSourceOptions,
  onDelete,
  onSourceChange,
  onUpload,
  onUrlValidate
}: EditAdditionalLicenseItemProps): ReactElement {
  const [isUrlValidating, setIsUrlValidating] = useState(false)
  const isNameDisabled = isUploading || isUrlValidating
  const fieldNamePrefix = `additionalLicenseFiles[${index}]`

  return (
    <div className={styles.additionalLicenseItem}>
      <div className={styles.additionalLicenseFieldWrapper}>
        <div className={styles.additionalLicenseFieldHeader}>
          <div className={styles.additionalLicenseTitle}>
            <Label htmlFor={`${fieldNamePrefix}.name`}>
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
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
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
              hideLabel
              isAdditionalLicense
              errorClassName={styles.additionalLicenseError}
              onValidationLoadingChange={setIsUrlValidating}
              onValidationComplete={onUrlValidate}
            />
          ) : (
            <>
              <Label
                htmlFor={`additional-file-${index}`}
                className={styles.labelNoMargin}
              >
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
