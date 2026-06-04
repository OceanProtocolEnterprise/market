import { ReactElement } from 'react'
import Modal from '@shared/atoms/Modal'
import Button from '@shared/atoms/Button'
import { authSetupCopy } from '@components/Auth/constants'
import styles from './index.module.css'

interface WalletChoiceModalProps {
  isOpen: boolean
  isDfnsConnecting?: boolean
  onClose: () => void
  onSelectMetaMask: () => void
  onSelectDfns: () => void
}

export default function WalletChoiceModal({
  isOpen,
  isDfnsConnecting = false,
  onClose,
  onSelectMetaMask,
  onSelectDfns
}: WalletChoiceModalProps): ReactElement {
  if (!isOpen) return null

  return (
    <Modal
      title="Connect a wallet"
      isOpen
      onToggleModal={onClose}
      shouldCloseOnOverlayClick
    >
      <div className={styles.choices}>
        <Button
          style="primary"
          type="button"
          onClick={onSelectMetaMask}
          className={styles.choice}
        >
          {authSetupCopy.connectBrowserWallet}
        </Button>
        <Button
          style="primary"
          type="button"
          onClick={onSelectDfns}
          disabled={isDfnsConnecting}
          className={styles.choice}
        >
          {isDfnsConnecting
            ? authSetupCopy.dfnsConnecting
            : authSetupCopy.connectDfnsWallet}
        </Button>
      </div>
    </Modal>
  )
}
