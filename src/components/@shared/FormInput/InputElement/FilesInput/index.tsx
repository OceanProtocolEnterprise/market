import { ReactElement, useEffect, useState } from 'react'
import { Field, useField } from 'formik'
import FileInfoDetails from './Info'
import UrlInput from '../URLInput'
import Input, { InputProps } from '@shared/FormInput'
import { getFileInfo, checkValidProvider, StorageType } from '@utils/provider'
import { LoggerInstance, FileInfo, S3FileObject } from '@oceanprotocol/lib'
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
import { createLanguageValueObject } from '@utils/jsonLd'

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
  const storageType: StorageType = field.value?.[0]?.type || 'url'
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

      if (storageType === 's3') {
        const trimmedEndpoint = endpoint.trim()
        const trimmedRegion = region.trim()
        const trimmedBucket = bucket.trim()
        const trimmedObjectKey = objectKey.trim()
        const trimmedAccessKeyId = accessKeyId.trim()
        const trimmedSecretAccessKey = secretAccessKey.trim()

        const hasWhitespace =
          endpoint !== trimmedEndpoint ||
          region !== trimmedRegion ||
          bucket !== trimmedBucket ||
          objectKey !== trimmedObjectKey ||
          accessKeyId !== trimmedAccessKeyId ||
          secretAccessKey !== trimmedSecretAccessKey

        if (hasWhitespace) {
          const updatedS3Access = {
            ...s3Access,
            endpoint: trimmedEndpoint,
            region: trimmedRegion,
            bucket: trimmedBucket,
            objectKey: trimmedObjectKey,
            accessKeyId: trimmedAccessKeyId,
            secretAccessKey: trimmedSecretAccessKey,
            forcePathStyle
          }

          const updatedValue = {
            ...field.value[0],
            s3Access: updatedS3Access
          }

          await helpers.setValue([updatedValue])

          throw new Error(
            'Please remove leading and trailing spaces from all fields'
          )
        }
      }

      if (storageType === 'ftp') {
        const isValidFtp = url.startsWith('ftp://') || url.startsWith('ftps://')
        if (!isValidFtp) {
          throw Error('Invalid FTP URL. Must start with ftp:// or ftps://')
        }
      }

      if (
        storageType !== 's3' &&
        storageType !== 'ftp' &&
        isUrl(url) &&
        isGoogleUrl(url)
      ) {
        throw Error(
          'Google Drive is not supported. Use another hosting service.'
        )
      }

      const isValid = await checkValidProvider(providerUrl)
      if (!isValid) throw Error('✗ Provider cannot be reached.')

      let checkedFile

      if (storageType === 's3') {
        const s3Url = `s3://${bucket}/${objectKey}`

        const s3FileObject: S3FileObject = {
          type: 's3',
          s3Access: {
            endpoint,
            region: region || 'us-east-1',
            bucket,
            objectKey,
            accessKeyId,
            secretAccessKey,
            forcePathStyle
          }
        }

        checkedFile = await getFileInfo(
          s3Url,
          providerUrl,
          's3',
          query,
          headers,
          abi,
          chainId,
          method,
          s3FileObject
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

      const isLicenseField =
        props.name.includes('licenseUrl') ||
        props.name.includes('metadata.additionalLicense[') ||
        props.name.startsWith('additionalLicense[')

      if (isLicenseField) {
        const descriptionLanguage = isEditPage
          ? values.descriptionLanguage
          : values.metadata?.descriptionLanguage
        const descriptionDirection = isEditPage
          ? values.descriptionDirection
          : values.metadata?.descriptionDirection
        let mirrors = []
        if (storageType === 's3') {
          mirrors = [
            {
              type: storageType,
              url: `s3://${bucket}/${objectKey}`
            }
          ]
        } else {
          mirrors = [
            {
              type: storageType || 'url',
              method: method || 'get',
              url
            }
          ]
        }

        const newDoc: any = {
          name: fileName,
          fileType: checkedFileInfo.contentType || checkedFileInfo.type || '',
          sha256: checkedFileInfo.checksum || '',
          ...(checkedFileInfo.contentLength && {
            additionalInformation: {
              size: Number(checkedFileInfo.contentLength)
            }
          }),
          displayName: createLanguageValueObject(
            fileName,
            descriptionLanguage,
            descriptionDirection
          ),
          description: createLanguageValueObject(
            '',
            descriptionLanguage,
            descriptionDirection
          ),
          mirrors
        }

        if (storageType === 's3') {
          newDoc.s3Access = {
            endpoint,
            region: region || 'us-east-1',
            bucket,
            objectKey,
            accessKeyId,
            secretAccessKey,
            forcePathStyle
          }
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
      } else {
        onValidationComplete?.(url, true, checkedFileInfo)
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
    const fallbackType =
      storageType === 'hidden'
        ? (props.activeFileType as StorageType | undefined) || 'url'
        : storageType

    if (fallbackType === 's3') {
      helpers.setValue([
        {
          type: 's3',
          s3Access: {
            endpoint: '',
            region: '',
            bucket: '',
            objectKey: '',
            accessKeyId: '',
            secretAccessKey: '',
            forcePathStyle: false
          },
          url: '',
          valid: false
        }
      ])
    } else {
      helpers.setValue([{ url: '', type: fallbackType }])
    }
    setTimeout(() => {
      setDisabledButton(true)
    }, 0)
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
      const hasAllRequiredFields =
        !!providerUrl &&
        !!endpoint.trim() &&
        !!bucket.trim() &&
        !!objectKey.trim() &&
        !!accessKeyId.trim() &&
        !!secretAccessKey.trim()

      if (isValidated) {
        setDisabledButton(true)
      } else {
        setDisabledButton(!hasAllRequiredFields)
      }
      return
    }
    if (storageType === 'ftp') {
      setDisabledButton(!providerUrl || !urlValue)
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
    secretAccessKey,
    isValidated
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
          ) : null}

          {(isValidated || field?.value?.[0]?.type === 'hidden') &&
            field?.value?.[0] && <FileInfoDetails file={field.value[0]} />}

          {props.innerFields && (
            <>
              {storageType === 's3' ? (
                <>
                  <div className={styles.s3GridContainer}>
                    {props.innerFields
                      .filter(
                        (innerField: any) => innerField.type !== 'checkbox'
                      )
                      .map((innerField: any, i: number) => {
                        const fieldName = `${field.name}[0].s3Access.${innerField.value}`
                        const fieldValue =
                          field.value?.[0]?.s3Access?.[innerField.value]

                        return (
                          <div key={i}>
                            <Field name={fieldName}>
                              {({ field: formikField, form, meta }: any) => (
                                <Input
                                  {...innerField}
                                  field={formikField}
                                  form={form}
                                  meta={meta}
                                  name={fieldName}
                                  value={fieldValue}
                                  disabled={isValidated}
                                  onBlur={(
                                    e: React.FocusEvent<HTMLInputElement>
                                  ) => {
                                    const trimmed = e.target.value.trim()
                                    if (trimmed !== e.target.value) {
                                      form.setFieldValue(fieldName, trimmed)
                                    }
                                  }}
                                />
                              )}
                            </Field>
                          </div>
                        )
                      })}
                  </div>

                  <div className={styles.s3LastRow}>
                    <div className={styles.s3CheckboxWrapper}>
                      {props.innerFields
                        .filter(
                          (innerField: any) => innerField.type === 'checkbox'
                        )
                        .map((checkboxField: any, i: number) => {
                          const fieldName = `${field.name}[0].s3Access.${checkboxField.value}`
                          const fieldValue =
                            field.value?.[0]?.s3Access?.[checkboxField.value] ||
                            false

                          return (
                            <Field key={i} name={fieldName}>
                              {({ field: formikField, form, meta }: any) => (
                                <Input
                                  {...checkboxField}
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
                                      currentValue[0].s3Access[
                                        checkboxField.value
                                      ] = newValue
                                      helpers.setValue(currentValue)
                                    }
                                  }}
                                />
                              )}
                            </Field>
                          )
                        })}
                    </div>

                    <div className={styles.s3ButtonWrapper}>
                      {isLoading ? (
                        <Button
                          style="accent"
                          className={styles.submitButton}
                          disabled={true}
                        >
                          <Loader variant="white" />
                        </Button>
                      ) : (
                        <>
                          <PublishButton
                            icon="validate"
                            text="Submit S3 Configuration"
                            buttonStyle="gradient"
                            className={styles.s3SubmitButton}
                            onClick={(e: React.SyntheticEvent) => {
                              e.preventDefault()
                              const s3Url = `s3://${bucket}/${objectKey}`
                              handleValidation(e, s3Url)
                            }}
                            disabled={disabledButton || isValidated}
                          />
                          {isValidated && (
                            <DeleteButton onClick={handleClose} />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className={`${styles.textblock}`}>
                    {props.innerFields.map((innerField: any, i: number) => {
                      const fieldName = `${field.name}[0].${innerField.value}`
                      const fieldValue = field.value?.[0]?.[innerField.value]

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
                      style={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center'
                      }}
                    >
                      <PublishButton
                        icon="validate"
                        text={`Submit ${
                          storageType === 'graphql'
                            ? 'query'
                            : storageType === 'smartcontract'
                            ? 'abi'
                            : 'URL'
                        }`}
                        buttonStyle="gradient"
                        onClick={(e: React.SyntheticEvent) => {
                          e.preventDefault()
                          handleValidation(e, field.value[0].url)
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
        </>
      )}
    </div>
  )
}
