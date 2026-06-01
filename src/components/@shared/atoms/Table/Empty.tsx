import { markdownToHtml } from '@utils/markdown'
import { ReactElement, ReactNode } from 'react'
import styles from './Empty.module.css'

export default function Empty({
  message
}: {
  message?: string | ReactNode
}): ReactElement {
  if (typeof message === 'string') {
    return (
      <div
        className={styles.empty}
        dangerouslySetInnerHTML={{
          __html: message ? markdownToHtml(message) : 'No results found'
        }}
      />
    )
  }

  return <div className={styles.empty}>{message || 'No results found'}</div>
}
