import { ReactElement, useEffect, useState } from 'react'
import { Field, useField } from 'formik'
import FileInfoDetails from './Info'
import UrlInput from '../URLInput'
import Input, { InputProps } from '@shared/FormInput'
import { getFileInfo, checkValidProvider } from '@utils/provider'
import { LoggerInstance, FileInfo } from '@oceanprotocol/lib'
import { useAsset } from '@context/Asset'
import styles from './index.module.css'
import { useChainId } from 'wagmi'
import InputKeyValue from '../KeyValueInput'
import Button from '@shared/atoms/Button'
import PublishButton from '@shared/PublishButton'
import Loader from '@shared/atoms/Loader'
import { checkJson } from '@utils/codemirror'
import { isGoogleUrl } from '@utils/url/index'
import isUrl from 'is-url-superb'
import MethodInput from '../MethodInput'
import DeleteButton from '@shared/DeleteButton/DeleteButton'

type FilesInputProps = InputProps & {
  form?: {
    values?: any
    setFieldValue?: (field: string, value: any) => void
  }
  onRemove?: () => void
  onValidationLoadingChange?: (loading: boolean) => void
  onValidationComplete?: (url: string, isValid: boolean, fileData?: any) => void
}

export default function FilesInput(props: FilesInputProps): ReactElement {
  const {
    form,
    onValidationLoadingChange,
    onValidationComplete,
    ...inputProps
  } = props
  const values = form?.values
  const setFieldValue = form?.setFieldValue
  const [field, meta, helpers] = useField(props.name)
  const [isLoading, setIsLoading] = useState(false)
  const [disabledButton, setDisabledButton] = useState(true)
  const { asset } = useAsset()
  const chainId = useChainId()

  const providerUrl =
    props.form?.values?.services?.[0]?.providerUrl?.url ||
    asset?.credentialSubject?.services?.[0]?.serviceEndpoint
  const storageType = field.value?.[0]?.type
  const urlValue = field.value?.[0]?.url?.toString().trim() || ''
  const query = field.value?.[0]?.query || undefined
  const abi = field.value?.[0]?.abi || undefined
  const headers = field.value?.[0]?.headers || undefined
  const method = field.value?.[0]?.method || 'get'
  const s3Access = field.value?.[0]?.s3Access || {}
  const endpoint = s3Access?.endpoint || ''
  const region = s3Access?.region || ''
  const bucket = s3Access?.bucket || ''
  const objectKey = s3Access?.objectKey || ''
  const accessKeyId = s3Access?.accessKeyId || ''
  const secretAccessKey = s3Access?.secretAccessKey || ''
  const forcePathStyle = s3Access?.forcePathStyle || false

  const isValidated = field?.value?.[0]?.valid === true

  const isEditPage =
    props.name?.startsWith('additionalLicenseFiles[') ||
    props.name?.startsWith('licenseUrl')

  useEffect(() => {
    if (storageType === 's3' && field.value?.[0]) {
      const currentValue = field.value[0]
      if (!currentValue.s3Access) {
        currentValue.s3Access = {}
      }
      if (currentValue.s3Access.forcePathStyle === undefined) {
        currentValue.s3Access.forcePathStyle = false
        helpers.setValue([currentValue])
      }
    }
  }, [storageType])

  async function handleValidation(e: React.SyntheticEvent, url: string) {
    e?.preventDefault()
    if (!values || !setFieldValue) return

    try {
      setIsLoading(true)
      onValidationLoadingChange?.(true)

      if (storageType !== 's3' && isUrl(url) && isGoogleUrl(url)) {
        throw Error(
          'Google Drive is not supported. Use another hosting service.'
        )
      }

      const isValid = await checkValidProvider(providerUrl)
      if (!isValid) throw Error('✗ Provider cannot be reached.')

      let checkedFile

      if (storageType === 's3') {
        const s3Url = `s3://${bucket}/${objectKey}`
        checkedFile = await getFileInfo(
          s3Url,
          providerUrl,
          storageType,
          query,
          headers,
          abi,
          chainId,
          method,
          {
            endpoint,
            region,
            bucket,
            objectKey,
            accessKeyId,
            secretAccessKey,
            forcePathStyle
          }
        )
      } else {
        checkedFile = await getFileInfo(
          url,
          providerUrl,
          storageType,
          query,
          headers,
          abi,
          chainId,
          method
        )
      }

      if (!checkedFile || checkedFile[0].valid === false)
        throw Error('✗ No valid file detected.')

      const checkedFileInfo = (checkedFile[0] || {}) as Partial<FileInfo> & {
        method?: string
        contentType?: string
      }

      let normalizedFileInfo
      if (storageType === 's3') {
        normalizedFileInfo = {
          ...field.value[0],
          ...checkedFileInfo,
          type: storageType,
          s3Access: {
            endpoint,
            region: region || 'us-east-1',
            bucket,
            objectKey,
            accessKeyId,
            secretAccessKey,
            forcePathStyle
          },
          url: `s3://${bucket}/${objectKey}`,
          valid: true
        }
      } else {
        normalizedFileInfo = {
          ...field.value[0],
          ...checkedFileInfo,
          type: storageType,
          method: field.value?.[0]?.method || checkedFileInfo?.method || 'get',
          url,
          valid: true
        }
      }

      const fileName =
        storageType === 's3' ? objectKey : url.split('/').pop() || url

      onValidationComplete?.(url, true, {
        ...checkedFileInfo,
        name: fileName
      })

      const isMainLicense = props.name.includes('licenseUrl')
      const isAdditionalLicense =
        props.name.includes('metadata.additionalLicense[') ||
        props.name.startsWith('additionalLicense[')

      const newDoc = {
        name: fileName,
        fileType: checkedFileInfo.contentType || checkedFileInfo.type,
        sha256: checkedFileInfo.checksum,
        mirrors:
          storageType === 's3'
            ? [
                {
                  type: storageType,
                  url: `s3://${bucket}/${objectKey}`
                }
              ]
            : [{ url, type: storageType, method }],
        ...(storageType === 's3' && {
          s3Access: {
            endpoint,
            region: region || 'us-east-1',
            bucket,
            objectKey,
            accessKeyId,
            secretAccessKey,
            forcePathStyle
          }
        }),
        ...checkedFileInfo
      }

      if (isEditPage) {
        const currentDocs = values.license?.licenseDocuments || []

        if (isMainLicense) {
          setFieldValue('license.licenseDocuments', [
            newDoc,
            ...currentDocs.slice(1)
          ])
        } else if (isAdditionalLicense) {
          const mainLicense = currentDocs[0] || null
          const additionalDocs = currentDocs.slice(1)

          setFieldValue('license.licenseDocuments', [
            ...(mainLicense ? [mainLicense] : []),
            ...additionalDocs,
            newDoc
          ])
        }
      } else {
        const currentDocs = values.metadata?.license?.licenseDocuments || []

        if (isMainLicense) {
          setFieldValue('metadata.license.licenseDocuments', [
            newDoc,
            ...currentDocs.slice(1)
          ])
        } else if (isAdditionalLicense) {
          const mainLicense = currentDocs[0] || null
          const additionalDocs = currentDocs.slice(1)

          setFieldValue('metadata.license.licenseDocuments', [
            ...(mainLicense ? [mainLicense] : []),
            ...additionalDocs,
            newDoc
          ])
        }
      }

      helpers.setValue([normalizedFileInfo])
    } catch (error: any) {
      helpers.setError(error.message)
      onValidationComplete?.(url, false)
      LoggerInstance.error(error.message)
    } finally {
      setIsLoading(false)
      onValidationLoadingChange?.(false)
    }
  }

  async function handleMethod(method: string) {
    helpers.setValue([{ ...props.value[0], method }])
  }

  function handleClose() {
    helpers.setTouched(false)
    helpers.setValue([
      { url: '', type: storageType === 'hidden' ? 'ipfs' : storageType }
    ])
  }

  useEffect(() => {
    if (!storageType) return

    if (storageType === 'graphql') {
      setDisabledButton(!providerUrl || !query || !urlValue)
      return
    }

    if (storageType === 'smartcontract') {
      setDisabledButton(!providerUrl || !abi || !checkJson(abi) || !urlValue)
      return
    }
    if (storageType === 's3') {
      setDisabledButton(
        !providerUrl ||
          !endpoint ||
          !bucket ||
          !objectKey ||
          !accessKeyId ||
          !secretAccessKey
      )
      return
    }

    setDisabledButton(!providerUrl || !urlValue)

    if (meta.error?.length > 0) {
      const { url } = meta.error[0] as unknown as FileInfo
      url && setDisabledButton(true)
    }
  }, [
    storageType,
    providerUrl,
    headers,
    query,
    abi,
    meta,
    urlValue,
    endpoint,
    bucket,
    objectKey,
    accessKeyId,
    secretAccessKey
  ])

  return (
    <div className={styles.filesContainer}>
      {!field?.value?.[0] || !storageType ? (
        <div></div>
      ) : (
        <>
          {props.methods && storageType === 'url' ? (
            <MethodInput
              {...inputProps}
              name={`${field.name}[0].url`}
              isLoading={isLoading}
              checkUrl={true}
              handleButtonClick={handleMethod}
              storageType={storageType}
              disabled={isValidated}
            />
          ) : storageType !== 's3' ? (
            <UrlInput
              submitText="Validate"
              {...inputProps}
              name={`${field.name}[0].url`}
              isLoading={isLoading}
              hideButton={
                storageType === 'graphql' || storageType === 'smartcontract'
              }
              hideError={true}
              checkUrl={true}
              handleButtonClick={handleValidation}
              storageType={storageType}
              isValidated={isValidated}
              onReset={handleClose}
              showResetButton={!props.isAdditionalLicense}
            />
          ) : null}{' '}
          {(isValidated || field?.value?.[0]?.type === 'hidden') &&
            field?.value?.[0] && <FileInfoDetails file={field.value[0]} />}
          {props.innerFields && (
            <>
              <div className={`${styles.textblock}`}>
                {props.innerFields &&
                  props.innerFields.map((innerField: any, i: number) => {
                    let fieldName = `${field.name}[0].${innerField.value}`
                    let fieldValue = field.value?.[0]?.[innerField.value]
                    if (storageType === 's3') {
                      if (innerField.type === 'checkbox') {
                        fieldName = `${field.name}[0].s3Access.${innerField.value}`
                        fieldValue =
                          field.value?.[0]?.s3Access?.[innerField.value] ||
                          false
                      } else if (
                        innerField.value === 'endpoint' ||
                        innerField.value === 'region' ||
                        innerField.value === 'bucket' ||
                        innerField.value === 'objectKey' ||
                        innerField.value === 'accessKeyId' ||
                        innerField.value === 'secretAccessKey'
                      ) {
                        fieldName = `${field.name}[0].s3Access.${innerField.value}`
                        fieldValue =
                          field.value?.[0]?.s3Access?.[innerField.value]
                      }
                    }

                    return (
                      <Field key={i} name={fieldName}>
                        {({ field: formikField, form, meta }: any) => {
                          if (innerField.type === 'checkbox') {
                            return (
                              <Input
                                {...innerField}
                                type="checkbox"
                                name={fieldName}
                                checked={fieldValue}
                                value={fieldValue}
                                disabled={isValidated}
                                onChange={(
                                  e: React.ChangeEvent<HTMLInputElement>
                                ) => {
                                  const newValue = e.target.checked
                                  form.setFieldValue(fieldName, newValue)
                                  const currentValue = field.value
                                  if (currentValue?.[0]) {
                                    if (!currentValue[0].s3Access) {
                                      currentValue[0].s3Access = {}
                                    }
                                    currentValue[0].s3Access[innerField.value] =
                                      newValue
                                    helpers.setValue(currentValue)
                                  }
                                }}
                              />
                            )
                          } else if (innerField.type === 'headers') {
                            return (
                              <InputKeyValue
                                {...innerField}
                                field={formikField}
                                form={form}
                                meta={meta}
                                name={fieldName}
                                value={fieldValue}
                                disabled={isValidated}
                              />
                            )
                          } else {
                            return (
                              <Input
                                {...innerField}
                                field={formikField}
                                form={form}
                                meta={meta}
                                name={fieldName}
                                value={fieldValue}
                                disabled={isValidated}
                              />
                            )
                          }
                        }}
                      </Field>
                    )
                  })}
              </div>

              {isLoading ? (
                <Button
                  style="accent"
                  className={styles.submitButton}
                  disabled={true}
                >
                  <Loader variant="white" />
                </Button>
              ) : (
                <div
                  style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
                >
                  <PublishButton
                    icon="validate"
                    text={`Submit ${
                      storageType === 'graphql'
                        ? 'query'
                        : storageType === 'smartcontract'
                        ? 'abi'
                        : storageType === 's3'
                        ? 'S3 Configuration'
                        : 'URL'
                    }`}
                    buttonStyle="gradient"
                    onClick={(e: React.SyntheticEvent) => {
                      e.preventDefault()
                      if (storageType === 's3') {
                        const s3Url = `s3://${bucket}/${objectKey}`
                        handleValidation(e, s3Url)
                      } else {
                        handleValidation(e, field.value[0].url)
                      }
                    }}
                    disabled={disabledButton || isValidated}
                  />
                  {isValidated && <DeleteButton onClick={handleClose} />}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
