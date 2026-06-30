import { ReactElement } from 'react'
import styles from './TruncatedMetaValue.module.css'

interface TruncatedMetaValueProps {
  value: string
  start?: number
  end?: number
}

function truncateMiddle(value: string, start: number, end: number): string {
  if (value.length <= start + end) return value
  return `${value.slice(0, start)}....${value.slice(-end)}`
}

export default function TruncatedMetaValue({
  value,
  start = 6,
  end = 6
}: TruncatedMetaValueProps): ReactElement {
  return (
    <span className={styles.root}>
      <code className={styles.truncated} title={value} aria-label={value}>
        {truncateMiddle(value, start, end)}
      </code>
      <span className={styles.fullValue}>{value}</span>
    </span>
  )
}
