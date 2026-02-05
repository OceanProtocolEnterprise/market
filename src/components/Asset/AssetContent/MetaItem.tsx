import { ReactElement, ReactNode } from 'react'
import cs from 'classnames'
import styles from './MetaItem.module.css'

export default function MetaItem({
  title,
  content,
  horizontal = false
}: {
  title: string
  content: ReactNode
  horizontal?: boolean
}): ReactElement {
  return (
    <div className={cs(styles.metaItem, horizontal && styles.horizontal)}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.content}>{content}</div>
    </div>
  )
}
