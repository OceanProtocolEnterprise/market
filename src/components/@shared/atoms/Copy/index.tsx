import { ReactElement, useCallback, useEffect, useState } from 'react'
import styles from './index.module.css'
import IconCopy from '@images/copy.svg'

export interface CopyProps {
  text: string
}

export default function Copy({ text }: CopyProps): ReactElement {
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!text) return
    let copied = false

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        copied = true
      } catch (error) {
        console.warn('Copy to clipboard failed', error)
      }
    }

    if (!copied && typeof document !== 'undefined') {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.top = '-9999px'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      try {
        copied = document.execCommand('copy')
      } catch (error) {
        console.warn('Fallback copy to clipboard failed', error)
      } finally {
        document.body.removeChild(textarea)
      }
    }

    if (copied) setIsCopied(true)
  }, [text])

  // Clear copy success style after 5 sec.
  useEffect(() => {
    if (!isCopied) return

    const timeout = setTimeout(() => {
      setIsCopied(false)
    }, 5000)

    return () => clearTimeout(timeout)
  }, [isCopied])

  return (
    <button
      type="button"
      title="Copy to clipboard"
      onClick={handleCopy}
      className={`${styles.button} ${isCopied ? styles.copied : ''}`}
    >
      <div className={styles.action}>
        <IconCopy className={styles.icon} />
        {isCopied && <span className={styles.feedback}>Copied!</span>}
      </div>
    </button>
  )
}
