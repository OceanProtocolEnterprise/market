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
import { customProviderUrl } from 'app.config.cjs'

type FilesInputProps = InputProps & {
  form?: {
    values?: any
    setFieldValue?: (field: string, value: any) => void
  }
  onRemove?: () => void
}

export default function FilesInput(props: FilesInputProps): ReactElement {
  const { form } = props
  const values = form?.values
  const setFieldValue = form?.setFieldValue
  const [field, meta, helpers] = useField(props.name)
  const [isLoading, setIsLoading] = useState(false)
  const [disabledButton, setDisabledButton] = useState(true)
  const { asset } = useAsset()
  const chainId = useChainId()

  const providerUrl =
    customProviderUrl ||
    props.form?.values?.services?.[0]?.providerUrl?.url ||
    asset.credentialSubject?.services?.[0]?.serviceEndpoint

  const storageType = field.value?.[0]?.type
  const urlValue = field.value?.[0]?.url?.toString().trim() || ''
  const query = field.value?.[0]?.query || undefined
  const abi = field.value?.[0]?.abi || undefined
  const headers = field.value?.[0]?.headers || undefined
  const method = field.value?.[0]?.method || 'get'
  const isValidated = field?.value?.[0]?.valid === true

  async function handleValidation(e: React.SyntheticEvent, url: string) {
    e?.preventDefault()
    if (!values || !setFieldValue) return

    try {
      setIsLoading(true)

      if (isUrl(url) && isGoogleUrl(url)) {
        throw Error(
          'Google Drive is not supported. Use another hosting service.'
        )
      }

      const isValid = await checkValidProvider(providerUrl)
      if (!isValid) throw Error('✗ Provider cannot be reached.')

      const checkedFile = await getFileInfo(
        url,
        providerUrl,
        storageType,
        query,
        headers,
        abi,
        chainId,
        method
      )

      if (!checkedFile || checkedFile[0].valid === false)
        throw Error('✗ No valid file detected.')
      const currentDocs = values.metadata?.license?.licenseDocuments || []
      const checkedFileInfo = (checkedFile[0] || {}) as Partial<FileInfo> & {
        method?: string
        contentType?: string
      }
      const normalizedFileInfo = {
        ...field.value[0],
        ...checkedFileInfo,
        type: storageType,
        method: field.value?.[0]?.method || checkedFileInfo?.method || 'get',
        url,
        valid: true
      }

      const isMainLicense = props.name.includes('licenseUrl')
      const isAdditionalLicense =
        props.name.includes('metadata.additionalLicense[') ||
        props.name.startsWith('additionalLicense[')

      const newDoc = {
        name: url.split('/').pop() || url,
        fileType: checkedFileInfo.contentType || checkedFileInfo.type,
        sha256: checkedFileInfo.checksum,
        mirrors: [{ url, type: storageType, method }],
        ...checkedFileInfo
      }

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

      helpers.setValue([normalizedFileInfo])
    } catch (error: any) {
      helpers.setError(error.message)
      LoggerInstance.error(error.message)
    } finally {
      setIsLoading(false)
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

    setDisabledButton(!providerUrl || !urlValue)

    if (meta.error?.length > 0) {
      const { url } = meta.error[0] as unknown as FileInfo
      url && setDisabledButton(true)
    }
  }, [storageType, providerUrl, headers, query, abi, meta, urlValue])

  return (
    <div className={styles.filesContainer}>
      {!field?.value?.[0] || !storageType ? (
        <div></div>
      ) : (
        <>
          {props.methods && storageType === 'url' ? (
            <MethodInput
              {...props}
              name={`${field.name}[0].url`}
              isLoading={isLoading}
              checkUrl={true}
              handleButtonClick={handleMethod}
              storageType={storageType}
              disabled={isValidated}
            />
          ) : (
            <UrlInput
              submitText="Validate"
              {...props}
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
          )}

          {(isValidated || field?.value?.[0]?.type === 'hidden') &&
            field?.value?.[0] && <FileInfoDetails file={field.value[0]} />}

          {props.innerFields && (
            <>
              <div className={`${styles.textblock}`}>
                {props.innerFields &&
                  props.innerFields.map((innerField: any, i: number) => {
                    return (
                      <Field
                        key={i}
                        component={
                          innerField.type === 'headers' ? InputKeyValue : Input
                        }
                        {...innerField}
                        name={`${field.name}[0].${innerField.value}`}
                        value={field.value?.[0]?.[innerField.value]}
                        disabled={isValidated}
                        render={({ field: formikField, form, meta }: any) =>
                          innerField.type === 'headers' ? (
                            <InputKeyValue
                              {...innerField}
                              field={formikField}
                              form={form}
                              meta={meta}
                              name={`${field.name}[0].${innerField.value}`}
                              value={field.value?.[0]?.[innerField.value]}
                              disabled={isValidated}
                            />
                          ) : (
                            <Input
                              {...innerField}
                              field={formikField}
                              form={form}
                              meta={meta}
                              name={`${field.name}[0].${innerField.value}`}
                              value={field.value?.[0]?.[innerField.value]}
                              disabled={isValidated}
                            />
                          )
                        }
                      />
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
    </div>
  )
}
