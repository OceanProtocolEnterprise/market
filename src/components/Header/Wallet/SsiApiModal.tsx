import Modal from '@shared/atoms/Modal'
import Button from '@shared/atoms/Button'
import styles from './SsiApiModal.module.css'

interface SsiApiModalProps {
  apiValue: string
  onChange: (value: string) => void
  onConnect: () => void
  onClose?: () => void
}

export default function SsiApiModal({
  apiValue,
  onChange,
  onConnect,
  onClose
}: SsiApiModalProps) {
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
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
      <Button type="button" style="primary" onClick={onConnect}>
        Set SSI Wallet API & Connect SSI
      </Button>
    </Modal>
  )
}
