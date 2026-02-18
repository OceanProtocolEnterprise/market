import Input from '@shared/FormInput'
import { Field } from 'formik'
import { ReactElement } from 'react'
import content from '../../../../content/publish/form.json'
import { getFieldContent } from '@utils/form'
import { FileUpload } from '@components/@shared/FileUpload'
import Label from '@components/@shared/FormInput/Label'
import AdditionalLicenseSection from '@shared/AdditionalLicenseSection'
import useMetadata from './useMetadata'

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
  const primaryUploadedLicenseDocument =
    values.metadata.uploadedLicense?.licenseDocuments?.[0]

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
        <div
          className={`${styles.licenseContainer} ${styles.licenseInteractionScope}`}
        >
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
              <Label htmlFor="license" className={styles.primaryLicenseLabel}>
                License File <span className={styles.required}>*</span>
              </Label>
              <FileUpload
                fileName={values.metadata.uploadedLicense?.name}
                fileSize={
                  primaryUploadedLicenseDocument?.additionalInformation
                    ?.size as number | undefined
                }
                fileType={primaryUploadedLicenseDocument?.fileType}
                buttonLabel="Upload File"
                setFileItem={handleLicenseFileUpload}
                buttonStyle="accent"
                disabled={!!primaryUploadedLicenseDocument}
                onReset={handleResetPrimaryUploadedLicense}
              />
            </div>
          )}

          <AdditionalLicenseSection
            fieldPathPrefix="metadata.additionalLicenseFiles"
            additionalFiles={additionalFiles}
            additionalFilesUploading={additionalFilesUploading}
            additionalFilesDeleting={additionalFilesDeleting}
            additionalFileSourceOptions={additionalFileSourceOptions}
            primaryLicenseReady={primaryLicenseReady}
            additionalLicenseSubtext={additionalLicenseSubtext}
            onAdd={handleNewAdditionalFile}
            onDelete={handleDeleteAdditionalFile}
            onSourceChange={handleAdditionalFileSourceChange}
            onUpload={handleAdditionalFileUpload}
          />
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
