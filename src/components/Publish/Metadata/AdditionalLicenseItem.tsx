import { ChangeEvent, ReactElement, useState } from 'react'
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
} from '../_license'
import {
  AdditionalLicenseSourceType,
  FormAdditionalLicenseFile
} from '../_types'
import styles from './index.module.css'

interface AdditionalLicenseItemProps {
  index: number
  additionalFile: FormAdditionalLicenseFile
  isUploading: boolean
  isDeleting: boolean
  additionalFileSourceOptions: AdditionalLicenseSourceType[]
  onDelete: () => void
  onSourceChange: (sourceType: AdditionalLicenseSourceType) => void
  onUpload: (fileItem: FileItem, onError: () => void) => void | Promise<void>
}

export default function AdditionalLicenseItem({
  index,
  additionalFile,
  isUploading,
  isDeleting,
  additionalFileSourceOptions,
  onDelete,
  onSourceChange,
  onUpload
}: AdditionalLicenseItemProps): ReactElement {
  const [isUrlValidating, setIsUrlValidating] = useState(false)
  const isNameDisabled = isUploading || isUrlValidating

  return (
    <div className={styles.additionalLicenseItem}>
      <div className={styles.additionalLicenseFieldWrapper}>
        <div className={styles.additionalLicenseFieldHeader}>
          <div className={styles.additionalLicenseTitle}>
            <Label htmlFor={`metadata.additionalLicenseFiles[${index}]`}>
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
            name={`metadata.additionalLicenseFiles[${index}].sourceType`}
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
            name={`metadata.additionalLicenseFiles[${index}].name`}
            label={LICENSE_UI.fileNameLabel}
            placeholder="e.g. terms.pdf"
            required
            disabled={isNameDisabled}
          />

          {additionalFile.sourceType === 'URL' ? (
            <Field
              {...getFieldContent('license', content.metadata.fields)}
              component={Input}
              name={`metadata.additionalLicenseFiles[${index}].url`}
              isAdditionalLicense
              errorClassName={styles.additionalLicenseError}
              onValidationLoadingChange={setIsUrlValidating}
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
                disabled={!!additionalFile.uploadedDocument}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
