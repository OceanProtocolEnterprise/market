import { ReactElement, useState } from 'react'
import { useField, useFormikContext } from 'formik'
import UrlInput from '../URLInput'
import { InputProps } from '@shared/FormInput'
import { FormPublishData } from '@components/Publish/_types'
import { LoggerInstance } from '@oceanprotocol/lib'
import ImageInfo from './Info'
import {
  getContainerChecksum,
  normalizeDockerImageReference
} from '@utils/docker'

export default function ContainerInput(props: InputProps): ReactElement {
  const [field] = useField(props.name)
  const [, , helpersChecksum] = useField('metadata.dockerImageCustomChecksum')

  const { values, setFieldError, setFieldValue } =
    useFormikContext<FormPublishData>()
  const [isLoading, setIsLoading] = useState(false)
  const [isValid, setIsValid] = useState(
    Boolean(values.metadata.dockerImageCustomChecksum)
  )
  const [checked, setChecked] = useState(
    Boolean(
      values.metadata.dockerImageCustom && values.metadata.dockerImageCustomTag
    )
  )

  async function handleValidation(e: React.SyntheticEvent, container: string) {
    e.preventDefault()
    try {
      setIsLoading(true)
      const { image: imageName, tag } = normalizeDockerImageReference(
        container,
        values.metadata.dockerImageCustomTag
      )
      const containerInfo = await getContainerChecksum(imageName, tag)
      setFieldValue('metadata.dockerImageCustom', imageName)
      setFieldValue('metadata.dockerImageCustomTag', tag)
      setChecked(true)
      if (containerInfo.checksum) {
        setFieldValue(
          'metadata.dockerImageCustomChecksum',
          containerInfo.checksum
        )
        helpersChecksum.setTouched(false)
        setIsValid(true)
      }
    } catch (error) {
      setFieldError(field.name, error.message)
      LoggerInstance.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  function handleClose() {
    setFieldValue('metadata.dockerImageCustom', '')
    setFieldValue('metadata.dockerImageCustomTag', '')
    setFieldValue('metadata.dockerImageCustomChecksum', '')
    setChecked(false)
    setIsValid(false)
    helpersChecksum.setTouched(true)
  }

  return (
    <>
      {checked ? (
        <ImageInfo
          image={values.metadata.dockerImageCustom}
          tag={values.metadata.dockerImageCustomTag}
          valid={isValid}
          handleClose={handleClose}
        />
      ) : (
        <UrlInput
          submitText="Use"
          {...props}
          name={field.name}
          checkUrl={false}
          isLoading={isLoading}
          storageType={'url'}
          handleButtonClick={handleValidation}
          inputType="text"
        />
      )}
    </>
  )
}
