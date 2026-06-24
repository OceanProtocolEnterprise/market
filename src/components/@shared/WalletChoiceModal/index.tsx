import { ReactElement } from 'react'
import Modal from '@shared/atoms/Modal'
import Button from '@shared/atoms/Button'
import { authSetupCopy } from '@components/Auth/constants'
import styles from './index.module.css'

interface WalletChoiceModalProps {
  isOpen: boolean
  isDfnsConnecting?: boolean
  isSignerServerConnecting?: boolean
  showDfns?: boolean
  showSignerServer?: boolean
  onClose: () => void
  onSelectMetaMask: () => void
  onSelectDfns: () => void
  onSelectSignerServer: () => void
}

export default function WalletChoiceModal({
  isOpen,
  isDfnsConnecting = false,
  isSignerServerConnecting = false,
  showDfns = true,
  showSignerServer = false,
  onClose,
  onSelectMetaMask,
  onSelectDfns,
  onSelectSignerServer
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
        {showDfns && (
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
        )}
        {showSignerServer && (
          <Button
            style="primary"
            type="button"
            onClick={onSelectSignerServer}
            disabled={isSignerServerConnecting}
            className={styles.choice}
          >
            {isSignerServerConnecting
              ? authSetupCopy.signerServerConnecting
              : authSetupCopy.connectSignerServer}
          </Button>
        )}
      </div>
    </Modal>
  )
}
