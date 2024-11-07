import Input from '@shared/FormInput'
import { Field, useFormikContext } from 'formik'
import { ReactElement, useState } from 'react'
import content from '../../../../content/publish/form.json'
import styles from './index.module.css'
import { getFieldContent } from '@utils/form'
import Button from '@components/@shared/atoms/Button'
import { useAccount } from 'wagmi'
import { FormAdditionalDdo, FormPublishData } from '../_types'
import { Signer } from 'ethers'
import jwt from 'jsonwebtoken'
import { useMarketMetadata } from '@context/MarketMetadata'

export default function AdditionalDdosFields(): ReactElement {
  const { appConfig } = useMarketMetadata()

  const account = useAccount()
  const { values, setFieldValue } = useFormikContext<FormPublishData>()

  const handleSigningWithWeb3Key = async () => {
    const signer: Signer = await account.connector?.getSigner()
    if (signer != null) {
      const signedDDOs: FormAdditionalDdo[] = []
      for (const ddo of values.additionalDdos) {
        if ((ddo.data as string).length === 0) {
          continue
        }
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

  const handleSigningWithSSIKey = async () => {
    if (values.ssiKey?.length === 0) {
      return
    }

    const signedDDOs: FormAdditionalDdo[] = []
    for (const ddo of values.additionalDdos) {
      if ((ddo.data as string).length === 0) {
        continue
      }

      const token = jwt.sign(ddo.data, values.ssiKey)
      signedDDOs.push({
        data: ddo.data,
        type: ddo.type,
        signature: token
      })
    }
    await setFieldValue('additionalDdos', signedDDOs)
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
      <Field
        {...getFieldContent('ssiKey', content.additionalDdos.fields)}
        component={Input}
        className={styles.ssiKey}
        name="ssiKey"
      />
      <div className={styles.newDdoBtn}>
        <Button type="button" style="primary" onClick={handleNewDdo}>
          New Ddo
        </Button>
      </div>

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

      {appConfig.ssiEnabled ? (
        <Button
          type="button"
          style={'primary'}
          disabled={values.ssiKey === undefined || values.ssiKey?.length === 0}
          onClick={handleSigningWithSSIKey}
        >
          Sign
        </Button>
      ) : (
        <Button
          type="button"
          style={'primary'}
          onClick={handleSigningWithWeb3Key}
        >
          Sign
        </Button>
      )}
    </>
  )
}
