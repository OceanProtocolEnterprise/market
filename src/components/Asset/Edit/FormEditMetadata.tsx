import { ReactElement, useEffect, useRef } from 'react'
import { Field, Form, useFormikContext } from 'formik'
import Input from '@shared/FormInput'
import FormActions from './FormActions'
import { useAsset } from '@context/Asset'
import { getFileInfo } from '@utils/provider'
import { getFieldContent } from '@utils/form'
import { isGoogleUrl } from '@utils/url'
import { MetadataEditForm } from './_types'
import content from '../../../../content/pages/editMetadata.json'
import consumerParametersContent from '../../../../content/publish/consumerParameters.json'
import IconDataset from '@images/dataset.svg'
import IconAlgorithm from '@images/algorithm.svg'
import { BoxSelectionOption } from '@components/@shared/FormInput/InputElement/BoxSelection'
import { FileUpload } from '@components/@shared/FileUpload'
import Label from '@components/@shared/FormInput/Label'
import { deleteIpfsFile, uploadFileItemToIPFS } from '@utils/ipfs'
import { FileItem } from '@utils/fileItem'
import { License } from '../../../@types/ddo/License'
import { RemoteObject } from '../../../@types/ddo/RemoteObject'
import SSIPoliciesSection from './SSIPoliciesSection'
import { AdditionalDdosFields } from '@components/@shared/AdditionalDdos'
import ContainerForm from '@components/@shared/atoms/ContainerForm'
import { LoggerInstance } from '@oceanprotocol/lib'
import appConfig from 'app.config.cjs'
import { toast } from 'react-toastify'
import AccessRulesSection from '@components/Publish/AccessPolicies/AccessRulesSection'
import useEditMetadata from './useEditMetadata'
import EditAdditionalLicenseItem from './EditAdditionalLicenseItem'
import Button from '@shared/atoms/Button'
import { LICENSE_UI } from '@components/Publish/_license'
import styles from './index.module.css'

const { data } = content.form
const assetTypeOptionsTitles = getFieldContent('type', data).options

export default function FormEditMetadata(): ReactElement {
  const { asset } = useAsset()
  const { values, setFieldValue } = useFormikContext<MetadataEditForm>()
  const firstPageLoad = useRef<boolean>(true)

  const {
    additionalFiles,
    additionalFilesUploading,
    additionalFilesDeleting,
    additionalFileSourceOptions,
    primaryLicenseReady,
    handleAdditionalFileUpload,
    handleNewAdditionalFile,
    handleDeleteAdditionalFile,
    handleAdditionalFileSourceChange,
    handleAdditionalFileUrlValidate,
    handleResetPrimaryUploadedLicense
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
    const providerUrl = asset.credentialSubject?.services[0].serviceEndpoint
    let links = []
    if (asset?.credentialSubject?.metadata?.links) {
      links = Object.values(asset?.credentialSubject?.metadata?.links)
    }

    links[0] &&
      getFileInfo(links[0], providerUrl, 'url').then((checkedFile) => {
        if (isGoogleUrl(links[0])) {
          setFieldValue('links', [
            {
              url: links[0],
              valid: false
            }
          ])
          return
        }
        setFieldValue('links', [
          {
            url: links[0],
            type: 'url',
            ...checkedFile[0]
          }
        ])
      })
  }, [
    asset.credentialSubject?.metadata?.links,
    asset.credentialSubject?.services,
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
        description: {
          '@value': '',
          '@direction': '',
          '@language': ''
        },
        displayName: {
          '@value': fileItem.name,
          '@language': '',
          '@direction': ''
        },
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
          {...getFieldContent('links', data)}
          component={Input}
          name="links"
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
        {asset.credentialSubject?.metadata?.type === 'algorithm' && (
          <>
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
                primaryUploadedLicenseDocument?.additionalInformation?.size as
                  | number
                  | undefined
              }
              fileType={primaryUploadedLicenseDocument?.fileType}
              buttonLabel="Upload File"
              setFileItem={handleLicenseFileUpload}
              buttonStyle="accent"
              disabled={!!primaryUploadedLicenseDocument}
              onReset={handleResetPrimaryUploadedLicense}
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

        {/* Additional License Files Section */}
        {primaryLicenseReady && (
          <>
            <div className={styles.additionalLicenseHeader}>
              <Label htmlFor="additionalLicenseFiles">
                {LICENSE_UI.additionalFilesHeader}
              </Label>
              <span className={styles.additionalLicenseSubtext}>
                Optional extra license documents (in addition to the primary
                license).
              </span>
            </div>

            {additionalFiles.map((additionalFile, index) => (
              <EditAdditionalLicenseItem
                key={additionalFile.id}
                index={index}
                additionalFile={additionalFile}
                isUploading={!!additionalFilesUploading[index]}
                isDeleting={!!additionalFilesDeleting[index]}
                additionalFileSourceOptions={additionalFileSourceOptions}
                onDelete={() => handleDeleteAdditionalFile(index)}
                onSourceChange={(sourceType) =>
                  handleAdditionalFileSourceChange(index, sourceType)
                }
                onUpload={(fileItem, onError) =>
                  handleAdditionalFileUpload(index, fileItem, onError)
                }
                onUrlValidate={(url, isValid, fileData) =>
                  handleAdditionalFileUrlValidate(index, url, isValid, fileData)
                }
              />
            ))}

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
          </>
        )}

        <AdditionalDdosFields />

        <FormActions />
      </ContainerForm>
    </Form>
  )
}
