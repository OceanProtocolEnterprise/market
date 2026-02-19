import { ReactElement } from 'react'
import styles from './index.module.css'
import CopyIconButton from '@shared/atoms/CopyIconButton'

interface CopyProps {
  text: string
}

export default function Copy({ text }: CopyProps): ReactElement {
  return (
    <CopyIconButton
      text={text}
      copyTitle="Copy to clipboard"
      copiedTitle="Copied!"
      copyAriaLabel="Copy to clipboard"
      copiedAriaLabel="Copied"
      resetAfterMs={5000}
      renderStatus={(copied) =>
        copied ? <span className={styles.feedback}>Copied!</span> : null
      }
    />
  )
}
