import Input from '@shared/FormInput'
import { Field } from 'formik'
import { ChangeEvent, ReactElement } from 'react'
import content from '../../../../content/publish/form.json'
import { AdditionalLicenseSourceType } from '../_types'
import { getFieldContent } from '@utils/form'
import { FileUpload } from '@components/@shared/FileUpload'
import Label from '@components/@shared/FormInput/Label'
import DeleteButton from '@shared/DeleteButton/DeleteButton'
import Button from '@shared/atoms/Button'
import Tooltip from '@shared/atoms/Tooltip'
import InfoIcon from '@images/info.svg'
import useMetadata from './useMetadata'
import {
  getAdditionalFileLabel,
  getAdditionalLicenseTooltipText,
  LICENSE_UI
} from '../_license'

import SectionContainer from '../../@shared/SectionContainer/SectionContainer'
import styles from './index.module.css'

export default function MetadataFields(): ReactElement {
  const {
    values,
    meta,
    assetTypeOptions,
    dockerImageOptions,
    additionalFiles,
    additionalFilesUploading,
    additionalFilesDeleting,
    additionalFileSourceOptions,
    additionalLicenseSubtext,
    primaryLicenseType,
    primaryLicenseReady,
    handleLicenseFileUpload,
    handleAdditionalFileUpload,
    handleNewAdditionalFile,
    handleDeleteAdditionalFile,
    handleAdditionalFileSourceChange,
    handleResetPrimaryUploadedLicense
  } = useMetadata()

  return (
    <>
      <Field
        {...getFieldContent('nft', content.metadata.fields)}
        component={Input}
        name="metadata.nft"
      />
      <Field
        {...getFieldContent('name', content.metadata.fields)}
        component={Input}
        name="metadata.name"
      />
      <Field
        {...getFieldContent('description', content.metadata.fields)}
        component={Input}
        name="metadata.description"
        rows={7}
      />
      <Field
        {...getFieldContent('tags', content.metadata.fields)}
        component={Input}
        name="metadata.tags"
      />
      <Field
        {...getFieldContent('author', content.metadata.fields)}
        component={Input}
        name="metadata.author"
      />

      <Field
        {...getFieldContent('type', content.metadata.fields)}
        component={Input}
        name="metadata.type"
        options={assetTypeOptions}
      />
      {values.metadata.type === 'dataset' && (
        <div className={styles.consentContainer}>
          <Field
            {...getFieldContent('dataSubjectConsent', content.metadata.fields)}
            component={Input}
            name="metadata.dataSubjectConsent"
          />
        </div>
      )}

      {values.metadata.type === 'algorithm' && (
        <>
          <SectionContainer title="Docker configuration" required>
            <Field
              {...getFieldContent('dockerImage', content.metadata.fields)}
              component={Input}
              name="metadata.dockerImage"
              options={dockerImageOptions}
            />
            {values.metadata.dockerImage === 'custom' && (
              <>
                <Field
                  {...getFieldContent(
                    'dockerImageCustom',
                    content.metadata.fields
                  )}
                  component={Input}
                  name="metadata.dockerImageCustom"
                />
                <Field
                  {...getFieldContent(
                    'dockerImageChecksum',
                    content.metadata.fields
                  )}
                  component={Input}
                  name="metadata.dockerImageCustomChecksum"
                  disabled={
                    values.metadata.dockerImageCustomChecksum && !meta.touched
                  }
                />
                <Field
                  {...getFieldContent(
                    'dockerImageCustomEntrypoint',
                    content.metadata.fields
                  )}
                  component={Input}
                  name="metadata.dockerImageCustomEntrypoint"
                />
              </>
            )}
          </SectionContainer>
        </>
      )}

      <SectionContainer title="License Type" required>
        <div className={styles.licenseContainer}>
          <div className={styles.licenseDropdownWrapper}>
            <Field
              {...getFieldContent(
                'licenseTypeSelection',
                content.metadata.fields
              )}
              component={Input}
              name="metadata.licenseTypeSelection"
            />
          </div>

          {primaryLicenseType === 'URL' && (
            <div className={styles.licenseUrlContainer}>
              <Field
                {...getFieldContent('license', content.metadata.fields)}
                component={Input}
                name="metadata.licenseUrl"
              />
            </div>
          )}

          {primaryLicenseType === 'Upload license file' && (
            <div className={styles.licenseUrlContainer}>
              <Label htmlFor="license">
                License File <span className={styles.required}>*</span>
              </Label>
              <FileUpload
                fileName={values.metadata.uploadedLicense?.name}
                fileSize={
                  values.metadata.uploadedLicense?.licenseDocuments?.[0]
                    ?.additionalInformation?.size as number | undefined
                }
                fileType={
                  values.metadata.uploadedLicense?.licenseDocuments?.[0]
                    ?.fileType
                }
                buttonLabel="Upload File"
                setFileItem={handleLicenseFileUpload}
                buttonStyle="accent"
                disabled={
                  !!values.metadata.uploadedLicense?.licenseDocuments?.[0]
                }
                onReset={handleResetPrimaryUploadedLicense}
              />
            </div>
          )}

          {primaryLicenseReady && (
            <div className={styles.additionalLicenseHeader}>
              <Label htmlFor="additionalLicenseFiles">
                {LICENSE_UI.additionalFilesHeader}
              </Label>
              <span className={styles.additionalLicenseSubtext}>
                {additionalLicenseSubtext}
              </span>
            </div>
          )}

          {primaryLicenseReady &&
            additionalFiles.map((additionalFile, index) => (
              <div
                key={`additional-file-${index}`}
                className={styles.additionalLicenseItem}
              >
                <div className={styles.additionalLicenseFieldWrapper}>
                  <div className={styles.additionalLicenseFieldHeader}>
                    <div className={styles.additionalLicenseTitle}>
                      <Label
                        htmlFor={`metadata.additionalLicenseFiles[${index}]`}
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
                      onClick={() => handleDeleteAdditionalFile(index)}
                      loading={!!additionalFilesDeleting[index]}
                      loadingText="Deleting..."
                      disabled={!!additionalFilesDeleting[index]}
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
                        handleAdditionalFileSourceChange(
                          index,
                          event.target.value as AdditionalLicenseSourceType
                        )
                      }}
                    />
                  </div>

                  {additionalFile.sourceType === 'URL' ? (
                    <Field
                      {...getFieldContent('license', content.metadata.fields)}
                      component={Input}
                      name={`metadata.additionalLicenseFiles[${index}].url`}
                      hideLabel
                      isAdditionalLicense
                      errorClassName={styles.additionalLicenseError}
                    />
                  ) : (
                    <div className={styles.licenseUrlContainer}>
                      <Field
                        component={Input}
                        name={`metadata.additionalLicenseFiles[${index}].name`}
                        label={LICENSE_UI.fileNameLabel}
                        placeholder="e.g. terms.pdf"
                        required
                        disabled={!!additionalFilesUploading[index]}
                      />
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
                        setFileItem={(fileItem, onError) =>
                          handleAdditionalFileUpload(index, fileItem, onError)
                        }
                        buttonStyle="accent"
                        disabled={!!additionalFile.uploadedDocument}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}

          {primaryLicenseReady && (
            <div className={styles.additionalFilesButtonWrapper}>
              <Button
                style="ghost"
                type="button"
                onClick={handleNewAdditionalFile}
                className={styles.addLicenseButton}
                disabled={!primaryLicenseReady}
              >
                {LICENSE_UI.addAdditionalFileButton}
              </Button>
            </div>
          )}
        </div>
      </SectionContainer>

      <div className={styles.termsAndConditionsContainer}>
        <Field
          {...getFieldContent('termsAndConditions', content.metadata.fields)}
          component={Input}
          name="metadata.termsAndConditions"
        />
      </div>
    </>
  )
}
