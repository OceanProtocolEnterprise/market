import Input from '@shared/FormInput'
import { Field, useFormikContext } from 'formik'
import { ReactElement } from 'react'
import content from '../../../../content/publish/form.json'
import { getFieldContent } from '@utils/form'
import Button from '@components/@shared/atoms/Button'
import { useAccount } from 'wagmi'
import { FormPublishData } from '../_types'
import { Signer } from 'ethers'

export default function AdditionalDDOFields(): ReactElement {
  const account = useAccount()
  const { values, setFieldValue } = useFormikContext<FormPublishData>()

  const handleSigning = async () => {
    const signer: Signer = await account.connector?.getSigner()

    if (signer != null) {
      const signature = await signer.signMessage(values.customDDO)
      await setFieldValue('customDDOSignature', signature)
    }
  }

  return (
    <>
      <Field
        {...getFieldContent('additionalDDO', content.additionalDDOs.fields)}
        component={Input}
        name="additionalDDO"
      />
      <Button style={'primary'} onClick={handleSigning}>
        Sign
      </Button>
    </>
  )
}
