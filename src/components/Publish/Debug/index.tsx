import { ReactElement, useEffect, useState } from 'react'
import DebugOutput from '@shared/DebugOutput'
import { FormPublishData } from '../_types'
import { useFormikContext } from 'formik'
import { transformPublishFormToDdo } from '../_utils'
import styles from './index.module.css'
import { previewDebugPatch } from '@utils/ddo'
import { Asset } from 'src/@types/Asset'
import { useCancelToken } from '@hooks/useCancelToken'
import { useEthersSigner } from '@hooks/useEthersSigner'
import { Signer } from 'ethers'

export default function Debug(): ReactElement {
  const { values } = useFormikContext<FormPublishData>()
  const [valuePreview, setValuePreview] = useState({})
  const [ddo, setDdo] = useState<Asset>()
  const newCancelToken = useCancelToken()
  const walletClient = useEthersSigner()
  const signer = walletClient as unknown as Signer

  useEffect(() => {
    async function makeDdo() {
      const ddo = await transformPublishFormToDdo(
        values,
        null,
        null,
        newCancelToken(),
        signer
      )
      setValuePreview(previewDebugPatch(values))
      setDdo(ddo)
    }
    makeDdo()
  }, [values])

  return (
    <div className={styles.debug}>
      <DebugOutput title="Collected Form Values" output={valuePreview} large />
      <DebugOutput title="Transformed DDO Values" output={ddo} large />
    </div>
  )
}
