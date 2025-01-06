import Input from '@shared/FormInput'
import { Field, useFormikContext } from 'formik'
import { ReactElement, useEffect } from 'react'
import content from '../../../../content/publish/form.json'
import styles from './index.module.css'
import { getFieldContent } from '@utils/form'
import Button from '@components/@shared/atoms/Button'
import { FormAdditionalDdo, FormPublishData } from '../_types'

export default function AdditionalDdosFields(): ReactElement {
  const { values, setFieldValue } = useFormikContext<FormPublishData>()

  const handleNewDdo = async () => {
    const ddos = values.additionalDdos.slice()
    const newDDO: FormAdditionalDdo = {
      data: '',
      type: 'raw'
    }
    ddos.push(newDDO)
    await setFieldValue('additionalDdos', ddos)
  }

  const handleDelete = async (index: number) => {
    const ddos = [
      ...values.additionalDdos.slice(0, index),
      ...values.additionalDdos.slice(index + 1)
    ]
    await setFieldValue('additionalDdos', ddos)
  }

  useEffect(() => {
    if (values.additionalDdosPageVisited) {
      return
    }
    setFieldValue('additionalDdosPageVisited', true)
  })

  return (
    <>
      <div className={styles.newDdoBtn}>
        <Button type="button" style="primary" onClick={handleNewDdo}>
          New Ddo
        </Button>
      </div>

      {values.additionalDdos.map((ddo, index) => {
        return (
          <div key={`${index}`} className={styles.inputLine}>
            <div className={styles.ddoField}>
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
            <div className={styles.deleteBtn}>
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
    </>
  )
}
