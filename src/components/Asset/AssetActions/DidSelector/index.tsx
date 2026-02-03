import Button from '@components/@shared/atoms/Button'
import Modal from '@shared/atoms/Modal'
import { ReactElement, useEffect, useState } from 'react'
import styles from './index.module.css'
import { SsiWalletDid } from 'src/@types/SsiWallet'

export interface DidSelectorProps {
  showDialog: boolean
  setShowDialog: (boolean) => void
  acceptSelection: (selectedDid: SsiWalletDid) => void
  abortSelection: () => void
  dids: SsiWalletDid[]
}

export function DidSelector(props: DidSelectorProps): ReactElement {
  const { showDialog, setShowDialog, acceptSelection, abortSelection, dids } =
    props
  const [selectedDid, setSelectedDid] = useState<SsiWalletDid>()

  function handleAcceptSelection() {
    setShowDialog(false)
    acceptSelection(selectedDid)
  }

  function handleAbortSelection() {
    setShowDialog(false)
    abortSelection()
  }
  useEffect(() => {
    if (!showDialog) return
    if (dids?.length > 0) {
      setSelectedDid(dids[0])
    }
  }, [showDialog, dids])

  function handleDidSelection(event: any) {
    const selectedDid = dids.find(
      (did) => did.did === (event.target.value as string)
    )
    setSelectedDid(selectedDid)
  }

  const maxLength = 100

  return (
    <Modal
      title="DID Selector"
      isOpen={showDialog}
      onToggleModal={handleAbortSelection}
      shouldCloseOnOverlayClick
      className={styles.didModal}
    >
      <div className={`${styles.panelColumn} ${styles.width100p}`}>
        <label
          htmlFor="dids"
          className={`${styles.label} ${styles.marginBottom2}`}
        >
          Choose your DID:
        </label>

        <select
          className={`${styles.panelColumn} ${styles.marginBottom2} ${styles.inputField}`}
          onChange={handleDidSelection}
        >
          {dids?.map((did) => {
            return (
              <option key={did.did} value={`${did.did}`}>
                {did?.alias} -{' '}
                {did?.did?.length > maxLength
                  ? did?.did?.slice(0, maxLength).concat('...')
                  : did?.did}
              </option>
            )
          })}
        </select>

        <div className={styles.panelRow}>
          <Button
            type="button"
            style="primary"
            size="small"
            className={`${styles.abortButton}`}
            onClick={handleAbortSelection}
          >
            Cancel
          </Button>
          <Button
            type="button"
            style="primary"
            size="small"
            className={`${styles.acceptButton}`}
            onClick={handleAcceptSelection}
            disabled={!selectedDid}
          >
            Confirm
          </Button>
        </div>
      </div>
    </Modal>
  )
}
