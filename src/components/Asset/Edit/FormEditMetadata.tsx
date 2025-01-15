import { ReactElement, useEffect, useRef, useState } from 'react'
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
import { FileDrop } from '@shared/FileDrop'
import Label from '@components/@shared/FormInput/Label'
import { deleteIpfsFile, uploadFileItemToIPFS } from '@utils/ipfs'
import { FileItem } from '@utils/fileItem'
import { License } from '../../../@types/ddo/License'
import { IpfsRemoteSource } from 'src/components/@shared/IpfsRemoteSource'
import { RemoteObject } from '../../../@types/ddo/RemoteObject'
import { sha256 } from 'ohash'
import Button from '@components/@shared/atoms/Button'
import styles from './index.module.css'
import appConfig from 'app.config'
import { PolicyEditor } from '@components/@shared/PolicyEditor'

const { data } = content.form
const assetTypeOptionsTitles = getFieldContent('type', data).options

export default function FormEditMetadata(): ReactElement {
  const { asset } = useAsset()
  const { values, setFieldValue } = useFormikContext<MetadataEditForm>()
  const firstPageLoad = useRef<boolean>(true)

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

    // if we have a sample file, we need to get the files' info before setting defaults links value
    links[0] &&
      getFileInfo(links[0], providerUrl, 'url').then((checkedFile) => {
        // set valid false if url is using google drive
        if (isGoogleUrl(links[0])) {
          setFieldValue('links', [
            {
              url: links[0],
              valid: false
            }
          ])
          return
        }
        // initiate link with values from asset metadata
        setFieldValue('links', [
          {
            url: links[0],
            type: 'url',
            ...checkedFile[0]
          }
        ])
      })
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

    if (firstPageLoad.current) {
      firstPageLoad.current = false
      return
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
    <Form>
      <Field
        {...getFieldContent('type', data)}
        component={Input}
        name="metadata.type"
        options={assetTypeOptions}
        disabled={true} // just for view purposes
      />
      <Field {...getFieldContent('name', data)} component={Input} name="name" />
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
      <Field {...getFieldContent('tags', data)} component={Input} name="tags" />
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
            />
          )}
        </>
      )}

      {appConfig.ssiEnabled ? (
        <PolicyEditor
          label="SSI Policies"
          credentials={values.credentials}
          setCredentials={(newCredentials) =>
            setFieldValue('credentials', newCredentials)
          }
          name="credentials"
        />
      ) : (
        <></>
      )}

      <Field
        {...getFieldContent('allow', data)}
        component={Input}
        name="credentials.allow"
      />
      <Field
        {...getFieldContent('deny', data)}
        component={Input}
        name="credentials.deny"
      />

      <Field
        {...getFieldContent('assetState', data)}
        component={Input}
        name="assetState"
      />

      {/*
       Licensing and Terms
      */}
      <Field
        {...getFieldContent('licenseTypeSelection', content.form.data)}
        component={Input}
        name="useRemoteLicense"
      />
      {values.useRemoteLicense ? (
        <>
          <Label htmlFor="license">License</Label>
          <div className={styles.license}>
            <IpfsRemoteSource
              className={styles.licenseitem}
              noDocumentLabel="No license document available"
              remoteSource={
                values.uploadedLicense?.licenseDocuments?.[0]?.mirrors?.[0]
              }
            ></IpfsRemoteSource>
            <Button type="button" style="primary" onClick={handleLicenseRemove}>
              Delete
            </Button>
          </div>
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
            {...getFieldContent('license', content.form.data)}
            component={Input}
            name="licenseUrl"
          />
        </>
      )}

      <FormActions />
    </Form>
  )
}
