import { ReactElement } from 'react'
import Button from '../atoms/Button'
import DeleteIcon from '@images/delete.svg'
import Loader from '../atoms/Loader'
import styles from './DeleteButton.module.css'

interface DeleteButtonProps {
  onClick: () => void | Promise<void>
  disabled?: boolean
  className?: string
  loading?: boolean
  loadingText?: string
}

export default function DeleteButton({
  onClick,
  disabled = false,
  className = '',
  loading = false,
  loadingText = 'Deleting...'
}: DeleteButtonProps): ReactElement {
  return (
    <Button
      type="button"
      style="ghost"
      onClick={onClick}
      disabled={disabled || loading}
      className={`${styles.deleteButton} ${className}`}
    >
      {loading ? (
        <span className={styles.loadingContent}>
          <Loader
            variant="primary"
            noMargin
            className={styles.loadingSpinner}
          />
          {loadingText}
        </span>
      ) : (
        <>
          <DeleteIcon />
          Delete
        </>
      )}
    </Button>
  )
}
