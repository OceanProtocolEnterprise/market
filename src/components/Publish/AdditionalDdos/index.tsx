import Input from '@shared/FormInput'
import { Field, useFormikContext } from 'formik'
import { ReactElement, useEffect } from 'react'
import content from '../../../../content/publish/form.json'
import { getFieldContent } from '@utils/form'
import Button from '@components/@shared/atoms/Button'
import { useAccount } from 'wagmi'
import { FormPublishAdditionalDdo, FormPublishData } from '../_types'
import { Signer } from 'ethers'

export default function AdditionalDdosFields(): ReactElement {
  const account = useAccount()
  const { values, setFieldValue } = useFormikContext<FormPublishData>()

  const handleSigning = async () => {
    //  const signer: Signer = await account.connector?.getSigner()
    //  if (signer != null) {
    //    const signature = await signer.signMessage(values.customDDO)
    //    await setFieldValue('customDDOSignature', signature)
    //  }
  }

  useEffect(() => {
    const newDdos: FormPublishAdditionalDdo[] = [
      { id: '', type: 'test1', value: '' },
      { id: '', type: 'test2', value: '' }
    ]
    setFieldValue('additionalDdos', newDdos)
  }, [])

  return (
    <>
      {values.additionalDdos.map((ddo, index) => {
        return (
          <>
            <Field
              id={index}
              {...getFieldContent(
                'additionalDdos',
                content.additionalDdos.fields
              )}
              component={Input}
              name={`additionalDdos[${index}].value`}
            />
            <Button style={'primary'} onClick={handleSigning}>
              Sign
            </Button>
          </>
        )
      })}
    </>
  )
}
