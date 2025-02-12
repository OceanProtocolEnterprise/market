import { ReactElement, useEffect, useState } from 'react'
import styles from './index.module.css'
import Clipboard from 'react-clipboard.js'
import { CopyIcon } from '@components/@shared/Icons'

export interface CopyProps {
  text: string
}

export default function Copy({ text }: CopyProps): ReactElement {
  const [isCopied, setIsCopied] = useState(false)

  // Clear copy success style after 5 sec.
  useEffect(() => {
    if (!isCopied) return

    const timeout = setTimeout(() => {
      setIsCopied(false)
    }, 5000)

    return () => clearTimeout(timeout)
  }, [isCopied])

  return (
    <Clipboard
      data-clipboard-text={text}
      button-title="Copy to clipboard"
      onSuccess={() => setIsCopied(true)}
      className={`${styles.button} ${isCopied ? styles.copied : ''}`}
    >
      <div className={styles.action}>
        <CopyIcon className={styles.icon} />
        {isCopied && <span className={styles.feedback}>Copied!</span>}
      </div>
    </Clipboard>
  )
}
