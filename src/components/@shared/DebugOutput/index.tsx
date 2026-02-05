import { ReactElement, useState } from 'react'
import styles from './index.module.css'

export default function DebugOutput({
  title,
  output,
  large
}: {
  title?: string
  output: any
  large?: boolean
}): ReactElement {
  const jsonString = JSON.stringify(output, null, 2)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString)
      setCopied(true)

      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (e) {
      console.error('Failed to copy output', e)
    }
  }

  return (
    <div className={styles.debugOutput}>
      {title && (
        <div className={styles.header}>
          <h5>{title}</h5>

          <button
            type="button"
            className={styles.copyButton}
            onClick={handleCopy}
            aria-label={copied ? 'Copied' : 'Copy'}
          >
            <span className={styles.icon}>{copied ? '✔' : '📋'}</span>

            <span className={styles.tooltip}>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      )}

      <pre className={large ? styles.large : ''}>
        <code>{jsonString}</code>
      </pre>
    </div>
  )
}
