import { ReactElement, useEffect, useRef, useState } from 'react'
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
import { customProviderUrl } from 'app.config.cjs'
import CircleErrorIcon from '@images/circle_error.svg'
import CircleCheckIcon from '@images/circle_check.svg'
import ProviderOwnerInfoModal from '@shared/ProviderOwnerInfoModal'

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
  const { initialValues, setFieldError, values, setFieldValue } =
    useFormikContext<FormPublishData>()
  const [field, , helpers] = useField(props.name)
  const [isLoading, setIsLoading] = useState(false)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const didInitializeDefaultProviderRef = useRef(false)
  const previousProviderUrlRef = useRef<string>()

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

      // Check if provider is a valid provider
      const isValid = await ProviderInstance.isValidProvider(field.value.url)

      // No way to detect a failed request with ProviderInstance.isValidProvider,
      // making this error show up for multiple cases it shouldn't, like network
      // down.
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

      // Check if valid provider is for same chain user is on
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

      // if all good, add provider to formik state
      helpers.setValue({ url: field.value.url, valid: isValid, custom: true })
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
    helpers.setValue({ url: providerUrl, valid: true, custom: true })
  }

  function handleClear() {
    helpers.setValue({ url: '', valid: false, custom: true })
    helpers.setTouched(false)
  }

  return (
    <>
      <UrlInput
        submitText="Validate"
        {...props}
        name={`${field.name}.url`}
        isLoading={isLoading}
        handleButtonClick={handleValidation}
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
