import { ReactElement, useEffect, useMemo, useRef, useState } from 'react'
import { useField, useFormikContext } from 'formik'
import UrlInput from '../URLInput'
import { InputProps } from '@shared/FormInput'
import styles from './index.module.css'
import Button from '@shared/atoms/Button'
import {
  LoggerInstance,
  ProviderInstance,
  getErrorMessage
} from '@oceanprotocol/lib'
import { FormPublishData } from '@components/Publish/_types'
import axios from 'axios'
import { useCancelToken } from '@hooks/useCancelToken'
import { useChainId } from 'wagmi'
import { customProviderUrl, nodeUriIndex } from 'app.config.cjs'
import CircleErrorIcon from '@images/circle_error.svg'
import CircleCheckIcon from '@images/circle_check.svg'
import ProviderOwnerInfoModal from '@shared/ProviderOwnerInfoModal'

const CUSTOM_PROVIDER_OPTION = '__custom_provider__'

function getServiceFiles(
  values: FormPublishData,
  servicePath: string
): FormPublishData['services'][number]['files'] | undefined {
  const match = servicePath.match(/^services\[(\d+)\]$/)
  if (!match) return undefined

  const serviceIndex = Number(match[1])
  return values.services?.[serviceIndex]?.files
}

function invalidateServiceFile(
  file: FormPublishData['services'][number]['files'][number] | undefined
) {
  if (!file) {
    return { url: '', type: 'url', valid: false }
  }

  return {
    ...file,
    valid: false
  }
}

export default function CustomProvider(props: InputProps): ReactElement {
  const chainId = useChainId()
  const newCancelToken = useCancelToken()
  const {
    initialValues,
    setFieldError,
    setFieldTouched,
    values,
    setFieldValue
  } = useFormikContext<FormPublishData>()
  const [field, , helpers] = useField(props.name)
  const [isLoading, setIsLoading] = useState(false)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const didInitializeDefaultProviderRef = useRef(false)
  const previousProviderUrlRef = useRef<string>()

  const indexedProviders = useMemo(() => {
    const configuredProviders = Array.isArray(nodeUriIndex) ? nodeUriIndex : []
    const defaultProviderUrl =
      customProviderUrl || initialValues.services[0].providerUrl.url

    return [
      ...new Set([defaultProviderUrl, ...configuredProviders].filter(Boolean))
    ]
  }, [initialValues.services])

  const selectedProviderOption =
    !field.value?.custom &&
    field.value?.url &&
    indexedProviders.includes(field.value.url)
      ? field.value.url
      : CUSTOM_PROVIDER_OPTION
  const showProviderSelector = props.name.startsWith('services[')

  useEffect(() => {
    if (didInitializeDefaultProviderRef.current) return
    if (field.value && typeof field.value.url !== 'undefined') {
      didInitializeDefaultProviderRef.current = true
      return
    }

    const providerUrl =
      customProviderUrl || initialValues.services[0].providerUrl.url

    if (!providerUrl) return

    didInitializeDefaultProviderRef.current = true
    helpers.setValue({ url: providerUrl, valid: true, custom: true })
  }, [chainId, field.value, helpers, initialValues.services])

  useEffect(() => {
    const previousProviderUrl = previousProviderUrlRef.current
    const currentProviderUrl = field.value?.url

    previousProviderUrlRef.current = currentProviderUrl

    if (!previousProviderUrl || previousProviderUrl === currentProviderUrl) {
      return
    }

    if (!props.name.startsWith('services[')) return

    const servicePath = props.name.replace(/\.providerUrl$/, '')
    const currentFiles = getServiceFiles(values, servicePath)
    const hasValidatedFile = currentFiles?.[0]?.valid || currentFiles?.[0]?.url

    if (!hasValidatedFile) return

    setFieldValue(`${servicePath}.files`, [
      invalidateServiceFile(currentFiles?.[0])
    ])
  }, [field.value?.url, props.name, setFieldValue, values])

  async function handleValidation(e: React.SyntheticEvent) {
    e.preventDefault()

    try {
      setIsLoading(true)

      const isValid = await ProviderInstance.isValidProvider(field.value.url)

      if (!isValid) {
        setFieldError(
          `${field.name}.url`,
          '✗ No valid provider detected. Check your network, your URL and try again.'
        )
        LoggerInstance.error(
          '[Custom Provider]:',
          '✗ No valid provider detected. Check your network, your URL and try again.'
        )
        return
      }

      const providerResponse = await axios.get(field.value.url, {
        cancelToken: newCancelToken()
      })
      const userChainId = chainId || 100
      const providerChain =
        (providerResponse?.data?.chainId as number) ||
        providerResponse?.data?.chainIds

      const isCompatible =
        // eslint-disable-next-line eqeqeq
        providerChain == userChainId
          ? true
          : !!(
              providerChain.length > 0 &&
              providerChain.includes(userChainId.toString())
            )

      if (!isCompatible) {
        setFieldError(
          `${field.name}.url`,
          '✗ This provider is incompatible with the network your wallet is connected to.'
        )
        LoggerInstance.error(
          '[Custom Provider]:',
          '✗ This provider is incompatible with the network your wallet is connected to.'
        )
        return
      }

      helpers.setValue({
        url: field.value.url,
        valid: isValid,
        custom: field.value?.custom ?? true
      })
    } catch (error) {
      const message = getErrorMessage(error.message)
      setFieldError(`${field.name}.url`, message)
      LoggerInstance.error('[Custom Provider]:', message)
    } finally {
      setIsLoading(false)
    }
  }

  function handleDefault(e: React.SyntheticEvent) {
    e.preventDefault()
    const providerUrl =
      customProviderUrl || initialValues.services[0].providerUrl.url
    helpers.setValue({
      url: providerUrl,
      valid: true,
      custom: true
    })
  }

  function handleClear() {
    helpers.setValue({ url: '', valid: false, custom: true })
    helpers.setTouched(false)
  }

  function handleProviderSelection(providerUrl: string) {
    if (providerUrl === CUSTOM_PROVIDER_OPTION) {
      helpers.setValue({
        url: '',
        valid: false,
        custom: true
      })
      setFieldTouched(`${field.name}.url`, true, false)
      setFieldError(`${field.name}.url`, undefined)
      return
    }

    helpers.setValue({
      url: providerUrl,
      valid: false,
      custom: false
    })
    setFieldTouched(`${field.name}.url`, true, false)
    setFieldError(`${field.name}.url`, undefined)
  }

  return (
    <>
      {showProviderSelector && indexedProviders.length > 0 && (
        <div className={styles.selectWrapper}>
          <select
            className={styles.select}
            value={selectedProviderOption}
            onChange={(e) => handleProviderSelection(e.target.value)}
            disabled={props.disabled || field?.value?.valid === true}
          >
            {indexedProviders.map((providerUrl) => (
              <option key={providerUrl} value={providerUrl}>
                {providerUrl}
              </option>
            ))}
            <option value={CUSTOM_PROVIDER_OPTION}>Custom provider URL</option>
          </select>
        </div>
      )}

      <UrlInput
        submitText="Validate"
        {...props}
        name={`${field.name}.url`}
        isLoading={isLoading}
        handleButtonClick={handleValidation}
        disabled={props.disabled || !field.value?.custom}
        disableButton={props.disabled}
        isValidated={field?.value?.valid === true}
        onReset={handleClear}
        showResetButton={!props.disabled}
        additionalAction={
          field?.value?.valid === true ? (
            <Button
              style="outlined"
              size="small"
              type="button"
              className={styles.infoButton}
              onClick={(e) => {
                e.preventDefault()
                setIsInfoModalOpen(true)
              }}
            >
              Info
            </Button>
          ) : null
        }
      />

      {field?.value?.valid === true ? (
        <>
          <div className={styles.defaultContainer}>
            <CircleCheckIcon />
            <div className={styles.confirmed}>File confirmed</div>
          </div>
          <ProviderOwnerInfoModal
            title="Node Owner Info"
            isOpen={isInfoModalOpen}
            providerUrl={field?.value?.url}
            onClose={() => setIsInfoModalOpen(false)}
          />
        </>
      ) : !props.disabled ? (
        <Button
          style="text"
          size="small"
          onClick={handleDefault}
          className={styles.default}
        >
          <div className={styles.defaultContainer}>
            <CircleErrorIcon />
            Use Default Provider
          </div>
        </Button>
      ) : null}
    </>
  )
}
