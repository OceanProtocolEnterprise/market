import { ReactElement, useEffect, useState } from 'react'
import DebugOutput from '@shared/DebugOutput'
import { FormPublishData } from '../_types'
import { useFormikContext } from 'formik'
import { transformPublishFormToDdo } from '../_utils'
import styles from './index.module.css'
import { DDO } from '@oceanprotocol/lib'
import { previewDebugPatch } from '@utils/ddo'

export default function Debug(): ReactElement {
  const { values } = useFormikContext<FormPublishData>()
  const [valuePreview, setValuePreview] = useState({})
  const [ddo, setDdo] = useState<DDO>()

  useEffect(() => {
    async function makeDdo() {
      const ddo = await transformPublishFormToDdo(values)
      setValuePreview(previewDebugPatch(values))
      setDdo(ddo)
    }
    makeDdo()
  }, [values])

  return (
    <div className={styles.debug}>
      <DebugOutput title="Collected Form Values" output={valuePreview} />
      <DebugOutput title="Transformed DDO Values" output={ddo} />
    </div>
  )
}
