import Input from '@shared/FormInput'
import { Field, useFormikContext } from 'formik'
import { ReactElement, useEffect, useState } from 'react'
import IconDownload from '@images/download.svg'
import IconCompute from '@images/compute.svg'
import content from '../../../../content/publish/form.json'
import consumerParametersContent from '../../../../content/publish/consumerParameters.json'
import { getFieldContent } from '@utils/form'
import { FormPublishData } from '../_types'
import { useMarketMetadata } from '@context/MarketMetadata'
import styles from './index.module.css'
import Button from '@components/@shared/atoms/Button'
import { FileDrop } from '@components/@shared/FileDrop'
import Label from '@components/@shared/FormInput/Label'
import { FileItem } from '@utils/fileItem'
import { deleteIpfsFile, uploadFileItemToIPFS } from '@utils/ipfs'
import { RemoteObject } from 'src/@types/ddo/RemoteObject'
import { sha256 } from 'ohash'
import { License } from 'src/@types/ddo/License'
import { IpfsRemoteSource } from '@components/@shared/IpfsRemoteSource'
import { PolicyEditor } from '@components/@shared/PolicyEditor'
import { getDefaultPolicies } from '../_utils'

const accessTypeOptionsTitles = getFieldContent(
  'access',
  content.services.fields
).options

export default function ServicesFields(): ReactElement {
  const { appConfig } = useMarketMetadata()
  const [defaultPolicies, setDefaultPolicies] = useState<string[]>([])

  // connect with Form state, use for conditional field rendering
  const { values, setFieldValue } = useFormikContext<FormPublishData>()

  // name and title should be download, but option value should be access, probably the best way would be to change the component so that option is an object like {name,value}
  const accessTypeOptions = [
    {
      name: 'download',
      value: accessTypeOptionsTitles[0].toLowerCase(),
      title: 'Download',
      icon: <IconDownload />,
      // BoxSelection component is not a Formik component
      // so we need to handle checked state manually.
      checked:
        values.services[0].access === accessTypeOptionsTitles[0].toLowerCase()
    },
    {
      name: accessTypeOptionsTitles[1].toLowerCase(),
      value: accessTypeOptionsTitles[1].toLowerCase(),
      title: accessTypeOptionsTitles[1],
      icon: <IconCompute />,
      checked:
        values.services[0].access === accessTypeOptionsTitles[1].toLowerCase()
    }
  ]

  // Auto-change access type based on algo privacy boolean.
  // Could be also done later in transformPublishFormToDdo().
  useEffect(() => {
    if (
      values.services[0].algorithmPrivacy === null ||
      values.services[0].algorithmPrivacy === undefined
    )
      return

    setFieldValue(
      'services[0].access',
      values.services[0].algorithmPrivacy === true ? 'compute' : 'access'
    )
  }, [values.services[0].algorithmPrivacy, setFieldValue])

  useEffect(() => {
    if (appConfig.ssiEnabled) {
      getDefaultPolicies()
        .then((policies) => {
          setFieldValue('services[0].credentials.vcPolicies', policies)
          setDefaultPolicies(policies)
        })
        .catch((error) => {
          console.error(error)
        })
    }
  }, [])

  function handleLicenseFileUpload(
    fileItems: FileItem[],
    setSuccess: any,
    setError: any
  ) {
    try {
      fileItems.forEach(async (fileItem: FileItem) => {
        const remoteSource = await uploadFileItemToIPFS(fileItem)

        const remoteObject: RemoteObject = {
          name: fileItem.name,
          fileType: fileItem.name.split('.').pop(),
          sha256: sha256(fileItem.content),
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

        setSuccess('License uploaded', 4000)
      })
    } catch (err) {
      setError(err, 4000)
    }
  }

  // Resets license data after type change
  useEffect(() => {
    async function deleteRemoteFile() {
      if (values.uploadedLicense) {
        const ipfsHash =
          values.uploadedLicense?.licenseDocuments?.[0]?.mirrors?.[0]?.ipfsCid
        if (ipfsHash) {
          await deleteIpfsFile(ipfsHash)
        }
        setFieldValue('uploadedLicense', undefined)
      }
    }

    setFieldValue('licenseUrl', [{ url: '', type: 'url' }])
    deleteRemoteFile()
  }, [values.useRemoteLicense])

  async function handleLicenseRemove() {
    setFieldValue('uploadedLicense', undefined)

    const ipfsHash =
      values.uploadedLicense?.licenseDocuments?.[0]?.mirrors?.[0]?.ipfsCid
    if (ipfsHash) {
      await deleteIpfsFile(ipfsHash)
    }
    setFieldValue('uploadedLicense', undefined)
  }

  return (
    <>
      <Field
        {...getFieldContent('dataTokenOptions', content.services.fields)}
        component={Input}
        name="services[0].dataTokenOptions"
      />
      {values.metadata.type === 'algorithm' ? (
        <Field
          {...getFieldContent('algorithmPrivacy', content.services.fields)}
          component={Input}
          name="services[0].algorithmPrivacy"
        />
      ) : (
        <>
          <Field
            {...getFieldContent('access', content.services.fields)}
            component={Input}
            name="services[0].access"
            options={accessTypeOptions}
          />
        </>
      )}
      <Field
        {...getFieldContent('providerUrl', content.services.fields)}
        component={Input}
        name="services[0].providerUrl"
      />
      <Field
        {...getFieldContent('files', content.services.fields)}
        component={Input}
        name="services[0].files"
      />
      <Field
        {...getFieldContent('links', content.services.fields)}
        component={Input}
        name="services[0].links"
      />
      <Field
        {...getFieldContent('timeout', content.services.fields)}
        component={Input}
        name="services[0].timeout"
      />

      {appConfig.ssiEnabled ? (
        <PolicyEditor
          label="SSI Policies"
          credentials={values.services[0].credentials}
          setCredentials={(newCredentials) =>
            setFieldValue('services[0].credentials', newCredentials)
          }
          name="services[0].credentials"
          defaultPolicies={defaultPolicies}
        />
      ) : (
        <></>
      )}

      <Field
        {...getFieldContent('allow', content.credentials.fields)}
        component={Input}
        name="services[0].credentials.allow"
      />
      <Field
        {...getFieldContent('deny', content.credentials.fields)}
        component={Input}
        name="services[0].credentials.deny"
      />

      <Field
        {...getFieldContent('usesConsumerParameters', content.services.fields)}
        component={Input}
        name="services[0].usesConsumerParameters"
      />

      {values.services[0].usesConsumerParameters && (
        <Field
          {...getFieldContent(
            'consumerParameters',
            consumerParametersContent.consumerParameters.fields
          )}
          component={Input}
          name="services[0].consumerParameters"
        />
      )}

      {/*
       Licensing and Terms
      */}
      <Field
        {...getFieldContent('licenseTypeSelection', content.metadata.fields)}
        component={Input}
        name="useRemoteLicense"
      />
      {values.useRemoteLicense ? (
        <>
          <Label htmlFor="license">License</Label>
          {values.uploadedLicense ? (
            <>
              <div className={styles.license}>
                <IpfsRemoteSource
                  className={styles.licenseitem}
                  noDocumentLabel="No license document available"
                  remoteSource={values.uploadedLicense?.licenseDocuments
                    ?.at(0)
                    ?.mirrors?.at(0)}
                ></IpfsRemoteSource>
                <Button
                  type="button"
                  style="primary"
                  onClick={handleLicenseRemove}
                >
                  Delete
                </Button>
              </div>
            </>
          ) : null}
          <FileDrop
            dropAreaLabel="Drop a license file here"
            buttonLabel="Upload"
            onApply={handleLicenseFileUpload}
            singleFile={true}
          ></FileDrop>
        </>
      ) : (
        <>
          <Field
            {...getFieldContent('license', content.metadata.fields)}
            component={Input}
            name="licenseUrl"
          />
        </>
      )}
    </>
  )
}
