import { BoxSelectionOption } from '@shared/FormInput/InputElement/BoxSelection'
import Input from '@shared/FormInput'
import { Field, useField, useFormikContext } from 'formik'
import { ReactElement, useEffect } from 'react'
import content from '../../../../content/publish/form.json'
import consumerParametersContent from '../../../../content/publish/consumerParameters.json'
import { FormPublishData } from '../_types'
import IconDataset from '@images/dataset.svg'
import IconAlgorithm from '@images/algorithm.svg'
import styles from './index.module.css'
import { algorithmContainerPresets } from '../_constants'
import { useMarketMetadata } from '@context/MarketMetadata'
import { getFieldContent } from '@utils/form'

export default function CustomDDOFields(): ReactElement {
  const { siteContent } = useMarketMetadata()

  // connect with Form state, use for conditional field rendering
  const { values, setFieldValue } = useFormikContext<FormPublishData>()

  const [field, meta] = useField('metadata.dockerImageCustomChecksum')

  return (
    <>
      <Field
        {...getFieldContent('customDDO', content.customDDO.fields)}
        component={Input}
        name="customDDO"
      />
    </>
  )
}
