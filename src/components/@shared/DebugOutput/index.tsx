import { ReactElement, ReactNode } from 'react'
import CopyIconButton from '@shared/atoms/CopyIconButton'
import styles from './index.module.css'

export default function DebugOutput({
  title,
  output,
  large,
  headerLeft
}: {
  title?: string
  output: unknown
  large?: boolean
  headerLeft?: ReactNode
}): ReactElement {
  const jsonString = JSON.stringify(output, null, 2)

  return (
    <div className={styles.debugOutput}>
      {(title || headerLeft) && (
        <div className={styles.header}>
          {headerLeft || <h5>{title}</h5>}
          <CopyIconButton text={jsonString} variant="pill" />
        </div>
      )}

      <pre className={large ? styles.large : ''}>
        <code>{jsonString}</code>
      </pre>
    </div>
  )
}
