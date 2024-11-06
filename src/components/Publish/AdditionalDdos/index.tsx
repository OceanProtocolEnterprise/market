import Input from '@shared/FormInput'
import { Field, useFormikContext } from 'formik'
import { ReactElement } from 'react'
import content from '../../../../content/publish/form.json'
import styles from './index.module.css'
import { getFieldContent } from '@utils/form'
import Button from '@components/@shared/atoms/Button'
import { useAccount } from 'wagmi'
import { FormAdditionalDdo, FormPublishData } from '../_types'
import { Signer } from 'ethers'

export default function AdditionalDdosFields(): ReactElement {
  const account = useAccount()
  const { values, setFieldValue } = useFormikContext<FormPublishData>()

  const handleSigning = async () => {
    const signer: Signer = await account.connector?.getSigner()
    if (signer != null) {
      const signedDDOs: FormAdditionalDdo[] = []
      for (const ddo of values.additionalDdos) {
        const signature = await signer.signMessage(ddo.data)
        signedDDOs.push({
          data: ddo.data,
          type: ddo.type,
          signature
        })
      }
      await setFieldValue('additionalDdos', signedDDOs)
    }
  }

  const handleNewDdo = () => {
    const ddos = values.additionalDdos.slice()
    const newDDO: FormAdditionalDdo = {
      data: '',
      type: 'raw',
      signature: ''
    }
    ddos.push(newDDO)
    setFieldValue('additionalDdos', ddos)
  }

  const handleDelete = async (index: number) => {
    const ddos = [
      ...values.additionalDdos.slice(0, index),
      ...values.additionalDdos.slice(index + 1)
    ]
    await setFieldValue('additionalDdos', ddos)
  }

  return (
    <>
      <p>
        <Button type="button" style={'primary'} onClick={handleNewDdo}>
          New Ddo
        </Button>
      </p>

      {values.additionalDdos.map((ddo, index) => {
        return (
          <div key={`${index}`} className={styles.inputLine}>
            <div className={styles.ddoFieldColumn}>
              <Field
                {...getFieldContent(
                  'additionalDdos',
                  content.additionalDdos.fields
                )}
                component={Input}
                name={`additionalDdos[${index}].data`}
                rows={15}
              />
            </div>
            <div className={styles.deleteBtnColumn}>
              <Button
                type="button"
                style={'primary'}
                onClick={() => handleDelete(index)}
              >
                Delete
              </Button>
            </div>
          </div>
        )
      })}

      <Button type="button" style={'primary'} onClick={handleSigning}>
        Sign
      </Button>
    </>
  )
}
