import Input from '@shared/FormInput'
import { Field } from 'formik'
import { ReactElement } from 'react'
import content from '../../../../content/publish/form.json'
import { getFieldContent } from '@utils/form'

export default function CustomDDOFields(): ReactElement {
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
