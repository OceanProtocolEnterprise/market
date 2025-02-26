import Button from '@components/@shared/atoms/Button'
import { ReactElement, useEffect, useRef } from 'react'
import styles from './index.module.css'

export interface VpSelectorProps {
  showDialog: boolean
  setShowDialog: (boolean) => void
}

export function VpSelector(props: VpSelectorProps): ReactElement {
  const { showDialog, setShowDialog } = props
  const selectorDialog = useRef<HTMLDialogElement>(null)

  function handleCloseDialog() {
    setShowDialog(false)
  }

  useEffect(() => {
    if (showDialog) {
      selectorDialog.current.showModal()
    } else {
      selectorDialog.current.close()
    }
  }, [showDialog, setShowDialog])

  return (
    <dialog id="ssiWallet" ref={selectorDialog} className={styles.dialogBorder}>
      <div className={styles.panelColumn}>
        <h3>Verifiable Credentials to present</h3>

        <label htmlFor="ssiWallets" className={styles.marginBottom7px}>
          Choose your VP:
        </label>

        <Button
          style="primary"
          size="small"
          className={`${styles.width100p} ${styles.closeButton}`}
          onClick={handleCloseDialog}
        >
          Close
        </Button>
      </div>
    </dialog>
  )
}
