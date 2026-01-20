import { ReactElement, useCallback, useEffect, useRef, useState } from 'react'
import styles from './index.module.css'
import IconCopy from '@images/copy.svg'
import { copyTextToClipboard } from '@utils/clipboard'

export interface CopyProps {
  text: string
}

export default function Copy({ text }: CopyProps): ReactElement {
  const [isCopied, setIsCopied] = useState(false)
  const timeoutRef = useRef<number | null>(null)

  const setCopiedWithReset = useCallback(() => {
    setIsCopied(true)
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = window.setTimeout(() => {
      setIsCopied(false)
    }, 5000)
  }, [])

  const handleCopy = useCallback(async () => {
    const copied = await copyTextToClipboard(text)
    if (copied) setCopiedWithReset()
  }, [text, setCopiedWithReset])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <button
      type="button"
      title="Copy to clipboard"
      onClick={handleCopy}
      className={`${styles.button} ${isCopied ? styles.copied : ''}`}
      aria-label="Copy to clipboard"
      disabled={!text}
    >
      <div className={styles.action}>
        <IconCopy className={styles.icon} />
        {isCopied && <span className={styles.feedback}>Copied!</span>}
      </div>
    </button>
  )
}
