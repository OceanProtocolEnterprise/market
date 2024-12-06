import Input from '@shared/FormInput'
import { Field, useFormikContext } from 'formik'
import { ReactElement, useEffect } from 'react'
import IconDownload from '@images/download.svg'
import IconCompute from '@images/compute.svg'
import content from '../../../../content/publish/form.json'
import consumerParametersContent from '../../../../content/publish/consumerParameters.json'
import { getFieldContent } from '@utils/form'
import { FormPublishData } from '../_types'
import Button from '@components/@shared/atoms/Button'
import { FileDrop } from '@components/@shared/FileDrop'
import Label from '@components/@shared/FormInput/Label'
import { IpfsRemoteSource } from '@components/@shared/IpfsRemoteSource'
import styles from './index.module.css'
import { FileItem } from '@utils/fileItem'
import { uploadFileItemToIPFS } from '@utils/ipfs'
import appConfig from 'app.config'
import { License } from 'src/@types/ddo/License'
import { RemoteObject } from 'src/@types/ddo/RemoteObject'
import { sha256 } from 'ohash'

const accessTypeOptionsTitles = getFieldContent(
  'access',
  content.services.fields
).options

export default function ServicesFields(): ReactElement {
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

  function handleLicenseFileUpload(
    fileItems: FileItem[],
    setSuccess: any,
    setError: any
  ) {
    try {
      fileItems.forEach(async (fileItem: FileItem) => {
        const remoteSource = await uploadFileItemToIPFS(
          fileItem,
          appConfig.ipfsApiKey,
          appConfig.ipfsSecretApiKey
        )

        const remoteObject: RemoteObject = {
          name: fileItem.file.name,
          fileType: fileItem.file.name.split('.').pop(),
          sha256: sha256(fileItem.content),
          additionalInformation: {},
          description: {
            '@value': '',
            '@direction': '',
            '@language': ''
          },
          displayName: {
            '@value': fileItem.file.name,
            '@language': '',
            '@direction': ''
          },
          mirrors: [remoteSource]
        }

        const license: License = {
          name: fileItem.file.name,
          licenseDocuments: [remoteObject]
        }

        await setFieldValue('metadata.license', license)

        setSuccess()
      })
    } catch (err) {
      setError(err)
    }
  }

  async function handleLicenseRemove() {
    await setFieldValue('metadata.license', null)
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
      <Field
        {...getFieldContent('usesConsumerParameters', content.services.fields)}
        component={Input}
        name="services[0].usesConsumerParameters"
      />
      <Field
        {...getFieldContent('allow', content.services.fields)}
        component={Input}
        name="services[0].allow"
      />
      <Field
        {...getFieldContent('deny', content.services.fields)}
        component={Input}
        name="services[0].deny"
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
      <Label htmlFor="license">License</Label>
      <div className={styles.license}>
        <IpfsRemoteSource
          className={styles.licenseitem}
          noDocumentLabel="No license document available"
          remoteSource={values.metadata?.license?.licenseDocuments
            ?.at(0)
            ?.mirrors?.at(0)}
        ></IpfsRemoteSource>
        <Button
          type="button"
          style="primary"
          onClick={handleLicenseRemove}
          disabled={
            !values.metadata?.license?.licenseDocuments?.at(0)?.mirrors?.at(0)
          }
        >
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
  )
}
