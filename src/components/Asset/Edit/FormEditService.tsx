import { ReactElement } from 'react'
import { Field, Form, useFormikContext } from 'formik'
import Input from '@shared/FormInput'
import FormActions from './FormActions'
import { getFieldContent } from '@utils/form'
import consumerParametersContent from '../../../../content/publish/consumerParameters.json'
import { ServiceEditForm } from './_types'
import FormEditComputeService from './FormEditComputeService'
import { defaultServiceComputeOptions } from './_constants'
import styles from './index.module.css'
import { Service } from 'src/@types/ddo/Service'
import { ComputeIcon, DownloadIcon } from '@components/@shared/Icons'

export default function FormEditService({
  data,
  chainId,
  service,
  accessDetails
}: {
  data: FormFieldContent[]
  chainId: number
  service: Service
  accessDetails: AccessDetails
}): ReactElement {
  const formUniqueId = service.id // because BoxSelection component is not a Formik component
  const { values, setFieldValue } = useFormikContext<ServiceEditForm>()

  const accessTypeOptionsTitles = getFieldContent('access', data).options

  const accessTypeOptions = [
    {
      name: `access-${formUniqueId}-download`,
      value: 'access',
      title: accessTypeOptionsTitles[0],
      icon: <DownloadIcon />,
      // BoxSelection component is not a Formik component
      // so we need to handle checked state manually.
      checked: values.access === 'access'
    },
    {
      name: `access-${formUniqueId}-compute`,
      value: 'compute',
      title: accessTypeOptionsTitles[1],
      icon: <ComputeIcon />,
      checked: values.access === 'compute'
    }
  ]

  return (
    <Form className={styles.form}>
      <Field {...getFieldContent('name', data)} component={Input} name="name" />

      <Field
        {...getFieldContent('description', data)}
        component={Input}
        name="description"
      />

      <Field
        {...getFieldContent('access', data)}
        component={Input}
        name="access"
        options={accessTypeOptions}
        disabled={true}
      />

      {values.access === 'compute' && (
        <FormEditComputeService
          chainId={chainId}
          serviceEndpoint={service.serviceEndpoint} // if we allow editing serviceEndpoint, we need to update it here
          serviceCompute={service.compute || defaultServiceComputeOptions}
        />
      )}

      <Field
        {...getFieldContent('price', data)}
        component={Input}
        name="price"
        disabled={accessDetails.type === 'free'}
      />

      <Field
        {...getFieldContent('paymentCollector', data)}
        component={Input}
        name="paymentCollector"
      />

      <Field
        {...getFieldContent('providerUrl', data)}
        component={Input}
        name="providerUrl"
        disabled={true} // TODO tied with files and compute - not editable now
      />

      <Field
        {...getFieldContent('files', data)}
        component={Input}
        name="files"
      />

      <Field
        {...getFieldContent('timeout', data)}
        component={Input}
        name="timeout"
      />

      <Field
        {...getFieldContent('allow', data)}
        component={Input}
        name="allow"
      />
      <Field {...getFieldContent('deny', data)} component={Input} name="deny" />

      <Field
        {...getFieldContent('usesConsumerParameters', data)}
        component={Input}
        name="usesConsumerParameters"
      />
      {values.usesConsumerParameters && (
        <Field
          {...getFieldContent(
            'consumerParameters',
            consumerParametersContent.consumerParameters.fields
          )}
          component={Input}
          name="consumerParameters"
        />
      )}
      <FormActions />
    </Form>
  )
}
