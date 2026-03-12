import { useState } from 'react'
import Modal from '@shared/atoms/Modal'
import Button from '@shared/atoms/Button'
import Loader from '@shared/atoms/Loader'
import styles from './SsiApiModal.module.css'

interface SsiApiModalProps {
  apiValue: string
  onChange: (value: string) => void
  onConnect: () => Promise<void> | void
  onClose?: () => void
}

export default function SsiApiModal({
  apiValue,
  onChange,
  onConnect,
  onClose
}: SsiApiModalProps) {
  const [isConnecting, setIsConnecting] = useState(false)

  async function handleConnectClick() {
    if (isConnecting) return
    setIsConnecting(true)

    try {
      await onConnect()
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <Modal
      title="SSI Wallet API"
      isOpen
      onToggleModal={onClose}
      shouldCloseOnOverlayClick
      className={styles.modal}
    >
      <label>
        API URL:
        <input
          className={styles.input}
          type="text"
          value={apiValue}
          disabled={isConnecting}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
      <Button
        type="button"
        style="primary"
        className={styles.connectButton}
        onClick={handleConnectClick}
        disabled={isConnecting}
      >
        <span className={styles.buttonContent}>
          <span>Set SSI Wallet API & Connect SSI</span>
          {isConnecting && (
            <Loader variant="white" noMargin className={styles.buttonLoader} />
          )}
        </span>
      </Button>
    </Modal>
  )
}
