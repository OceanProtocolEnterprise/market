import { FormPublishData } from '@components/Publish/_types'
import { getFieldContent } from '@utils/form'
import { Field, useFormikContext } from 'formik'
import { ReactElement } from 'react'
import content from '../../../../content/publish/form.json'
import styles from './index.module.css'
import Input from '../FormInput'
import Button from '../atoms/Button'

export function PolicyEditor(): ReactElement {
  const { values, setFieldValue } = useFormikContext<FormPublishData>()

  function handleNewRequestPolicy() {}

  return (
    <>
      <Button style="primary" onClick={handleNewRequestPolicy}>
        New Request Policy
      </Button>
      {}

      {
        //  <Field
        //   {...getFieldContent('customPolicies', content.services.fields)}
        //   component={Input}
        //   name="services[0].policies.customPolicies"
        //   rows={10}
        //  />
      }
    </>
  )
}
