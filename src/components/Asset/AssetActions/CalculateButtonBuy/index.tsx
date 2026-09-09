import { FormEvent, ReactElement } from 'react'
import Button from '../../../@shared/atoms/Button'
import styles from './index.module.css'
import Loader from '../../../@shared/atoms/Loader'

interface CalculateButtonBuyProps {
  disabled?: boolean
  isLoading?: boolean
  onClick?: (e: FormEvent<HTMLButtonElement>) => void
  stepText?: string
  type?: 'submit'
}

export default function CalculateButtonBuy({
  disabled,
  onClick,
  stepText,
  isLoading,
  type
}: CalculateButtonBuyProps): ReactElement {
  return (
    <div className={styles.actions}>
      {isLoading ? (
        <Loader message={stepText} />
      ) : (
        <Button
          style="accent"
          type={type}
          onClick={onClick}
          disabled={disabled}
        >
          Calculate Total Price
        </Button>
      )}
    </div>
  )
}
