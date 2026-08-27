import { ReactElement, useEffect, useRef } from 'react'
import { Field, Form, useFormikContext } from 'formik'
import Input from '@shared/FormInput'
import FormActions from './FormActions'
import { useAsset } from '@context/Asset'
import { getFieldContent } from '@utils/form'
import { MetadataEditForm } from './_types'
import content from '../../../../content/pages/editMetadata.json'
import consumerParametersContent from '../../../../content/publish/consumerParameters.json'
import IconDataset from '@images/dataset.svg'
import IconAlgorithm from '@images/algorithm.svg'
import { BoxSelectionOption } from '@components/@shared/FormInput/InputElement/BoxSelection'
import { FileUpload } from '@components/@shared/FileUpload'
import Label from '@components/@shared/FormInput/Label'
import SectionContainer from '@shared/SectionContainer/SectionContainer'
import { deleteIpfsFile, uploadFileItemToIPFS } from '@utils/ipfs'
import { FileItem } from '@utils/fileItem'
import { License } from '../../../@types/ddo/License'
import { RemoteObject } from '../../../@types/ddo/RemoteObject'
import SSIPoliciesSection from './SSIPoliciesSection'
import { AdditionalDdosFields } from '@components/@shared/AdditionalDdos'
import ContainerForm from '@components/@shared/atoms/ContainerForm'
import AdditionalLicenseSection from '@shared/AdditionalLicenseSection'
import { LoggerInstance } from '@oceanprotocol/lib'
import appConfig from 'app.config.cjs'
import { toast } from 'react-toastify'
import AccessRulesSection from '@components/Publish/AccessPolicies/AccessRulesSection'
import useEditMetadata from './useEditMetadata'
import styles from './index.module.css'
import { FILE_UPLOAD_CONFIG } from '@components/@shared/FileUpload/helper'
import { createLanguageValueObject } from '@utils/jsonLd'
import ContainerUpdateCheckButton from './ContainerUpdateCheckButton'
import {
  getContainerChecksum,
  normalizeDockerImageReference
} from '@utils/docker'

const { data } = content.form
const assetTypeOptionsTitles = getFieldContent('type', data).options

export default function FormEditMetadata(): ReactElement {
  const { asset } = useAsset()
  const { values, setFieldTouched, setFieldValue } =
    useFormikContext<MetadataEditForm>()
  const firstPageLoad = useRef<boolean>(true)
  const previousContainerReference = useRef({
    image: values.containerImage,
    tag: values.containerTag
  })
  const automaticChecksumRequest = useRef(0)
  const {
    additionalFiles,
    additionalFilesUploading,
    additionalFilesDeleting,
    additionalFileSourceOptions,
    additionalLicenseSubtext,
    primaryLicenseReady,
    languageOptions,
    handleAdditionalFileUpload,
    handleNewAdditionalFile,
    handleDeleteAdditionalFile,
    handleAdditionalFileSourceChange,
    handleAdditionalFileUrlValidate,
    handleResetPrimaryUploadedLicense,
    getCurrentDescriptionLanguageName,
    handleDescriptionLanguageChange
  } = useEditMetadata()

  // BoxSelection component is not a Formik component
  // so we need to handle checked state manually.
  const assetTypeOptions: BoxSelectionOption[] = [
    {
      name: assetTypeOptionsTitles[0].toLowerCase(),
      title: assetTypeOptionsTitles[0],
      checked: values.type === assetTypeOptionsTitles[0].toLowerCase(),
      icon: <IconDataset />
    },
    {
      name: assetTypeOptionsTitles[1].toLowerCase(),
      title: assetTypeOptionsTitles[1],
      checked: values.type === assetTypeOptionsTitles[1].toLowerCase(),
      icon: <IconAlgorithm />
    }
  ]

  useEffect(() => {
    const image = values.containerImage?.trim() || ''
    const tag = values.containerTag?.trim() || ''
    const previousReference = previousContainerReference.current

    if (
      image === previousReference.image?.trim() &&
      tag === previousReference.tag?.trim()
    ) {
      return
    }

    previousContainerReference.current = { image, tag }
    const requestId = ++automaticChecksumRequest.current
    setFieldValue('containerChecksum', '', true)
    setFieldTouched('containerChecksum', false, false)

    if (!image || !tag || tag === 'latest') return

    try {
      const normalizedReference = normalizeDockerImageReference(image, tag)
      if (normalizedReference.image !== image) return
    } catch {
      return
    }

    const timeout = window.setTimeout(async () => {
      const containerInfo = await getContainerChecksum(image, tag)

      if (requestId !== automaticChecksumRequest.current) return
      if (!containerInfo.checksum) return

      await setFieldValue('containerChecksum', containerInfo.checksum, true)
      await setFieldTouched('containerChecksum', false, false)
    }, 600)

    return () => {
      window.clearTimeout(timeout)
      if (requestId === automaticChecksumRequest.current) {
        automaticChecksumRequest.current += 1
      }
    }
  }, [
    values.containerImage,
    values.containerTag,
    setFieldTouched,
    setFieldValue
  ])

  async function handleLicenseFileUpload(
    fileItem: FileItem,
    onError: () => void
  ) {
    try {
      const remoteSource = await uploadFileItemToIPFS(fileItem)
      const remoteObject: RemoteObject = {
        name: fileItem.name,
        fileType: fileItem.name.split('.').pop(),
        sha256: fileItem.checksum,
        additionalInformation: {},
        description: createLanguageValueObject(
          '',
          values.descriptionLanguage,
          values.descriptionDirection
        ),
        displayName: createLanguageValueObject(
          fileItem.name,
          values.descriptionLanguage,
          values.descriptionDirection
        ),
        mirrors: [remoteSource]
      }

      const license: License = {
        name: fileItem.name,
        licenseDocuments: [remoteObject]
      }

      setFieldValue('uploadedLicense', license)
    } catch (err) {
      toast.error('Could not upload file')
      LoggerInstance.error(err)
      setFieldValue('uploadedLicense', undefined)
      onError()
    }
  }

  useEffect(() => {
    async function deleteRemoteFile() {
      if (values.uploadedLicense) {
        const ipfsHash =
          values.uploadedLicense?.licenseDocuments?.[0]?.mirrors?.[0]?.ipfsCid
        if (appConfig.ipfsUnpinFiles && ipfsHash && ipfsHash?.length > 0) {
          try {
            await deleteIpfsFile(ipfsHash)
          } catch (error) {
            LoggerInstance.error("Can't delete license file")
          }
        }
      }
      await setFieldValue('uploadedLicense', undefined)
    }

    if (firstPageLoad.current) {
      firstPageLoad.current = false
      return
    }

    if (!values.useRemoteLicense) {
      deleteRemoteFile()
    } else {
      setFieldValue('licenseUrl', [{ url: '', type: 'url' }])
    }
  }, [values.useRemoteLicense, setFieldValue, values.uploadedLicense])

  const primaryUploadedLicenseDocument =
    values.uploadedLicense?.licenseDocuments?.[0]
  const linksFieldContent = getFieldContent('links', data)

  return (
    <Form>
      <ContainerForm style="accent">
        <Field
          {...getFieldContent('type', data)}
          component={Input}
          name="metadata.type"
          options={assetTypeOptions}
          disabled={true}
        />
        <Field
          {...getFieldContent('name', data)}
          component={Input}
          name="name"
        />
        <Field
          {...getFieldContent('description', data)}
          component={Input}
          name="description"
        />
        <Field
          {...getFieldContent('descriptionLanguage', data)}
          component={Input}
          name="descriptionLanguage"
          type="select"
          selectStyle="serviceLanguage"
          options={languageOptions}
          value={getCurrentDescriptionLanguageName()}
          onChange={(e) => handleDescriptionLanguageChange(e.target.value)}
        />
        <Field
          {...getFieldContent('descriptionDirection', data)}
          component={Input}
          name="descriptionDirection"
          readOnly
        />
        <Field
          {...getFieldContent('tags', data)}
          component={Input}
          name="tags"
        />

        <Field
          {...getFieldContent('author', data)}
          component={Input}
          name="author"
        />
        <Field
          {...getFieldContent('copyrightHolder', data)}
          component={Input}
          name="copyrightHolder"
        />
        <Field
          {...getFieldContent('providedBy', data)}
          component={Input}
          name="providedBy"
        />
        <SectionContainer
          title={linksFieldContent.label}
          help={linksFieldContent.help}
        >
          <Field
            {...linksFieldContent}
            component={Input}
            name="links"
            hideLabel
          />
        </SectionContainer>
        {asset.credentialSubject?.metadata?.type === 'algorithm' && (
          <>
            <SectionContainer title="Docker configuration" required>
              <Field
                {...getFieldContent('containerImage', data)}
                component={Input}
                name="containerImage"
              />
              <Field
                {...getFieldContent('containerTag', data)}
                component={Input}
                name="containerTag"
              />
              <div className={styles.containerChecksumRow}>
                <div className={styles.containerChecksumField}>
                  <Field
                    {...getFieldContent('containerChecksum', data)}
                    component={Input}
                    name="containerChecksum"
                    disabled
                  />
                </div>
                <ContainerUpdateCheckButton
                  image={values.containerImage || ''}
                  tag={values.containerTag || ''}
                  checksum={values.containerChecksum || ''}
                  className={styles.containerUpdateCheckButton}
                  onChecksumChange={async (checksum) => {
                    await setFieldValue('containerChecksum', checksum, true)
                    await setFieldTouched('containerChecksum', false, false)
                  }}
                />
              </div>
              <Field
                {...getFieldContent('containerEntrypoint', data)}
                component={Input}
                name="containerEntrypoint"
              />
            </SectionContainer>
            <Field
              {...getFieldContent('usesConsumerParameters', data)}
              component={Input}
              name="usesConsumerParameters"
            />
            {(values as unknown as MetadataEditForm).usesConsumerParameters && (
              <Field
                {...getFieldContent(
                  'consumerParameters',
                  consumerParametersContent.consumerParameters.fields
                )}
                component={Input}
                name="consumerParameters"
                type="consumerParametersBuilder"
              />
            )}
          </>
        )}

        <AccessRulesSection fieldPrefix="credentials" />

        <SSIPoliciesSection
          defaultPolicies={[
            'signature',
            'not-before',
            'revoked-status-list',
            'expired',
            'signature_sd-jwt-vc'
          ]}
          isAsset={true}
          hideDefaultPolicies={false}
        />

        <Field
          {...getFieldContent('assetState', data)}
          component={Input}
          name="assetState"
        />

        <SectionContainer title="License" required>
          <Field
            {...getFieldContent('licenseTypeSelection', content.form.data)}
            component={Input}
            name="useRemoteLicense"
          />

          {values.useRemoteLicense ? (
            <div className={styles.licenseUploadContainer}>
              <Label htmlFor="license">
                License File <span className={styles.required}>*</span>
              </Label>
              <FileUpload
                fileName={values.uploadedLicense?.name}
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
                showProgressBar={true}
                maxFileSizeKB={FILE_UPLOAD_CONFIG.MAX_LICENSE_FILE_SIZE_KB}
              />
            </div>
          ) : (
            <div className={styles.licenseUrlContainer}>
              <Field
                {...getFieldContent('license', content.form.data)}
                component={Input}
                name="licenseUrl"
              />
            </div>
          )}

          <AdditionalLicenseSection
            fieldPathPrefix="additionalLicenseFiles"
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
            onUrlValidate={handleAdditionalFileUrlValidate}
          />
        </SectionContainer>

        <AdditionalDdosFields />

        <FormActions />
      </ContainerForm>
    </Form>
  )
}
