import { ReactElement, ReactNode, useState } from 'react'
import Button from '@shared/atoms/Button'
import styles from './index.module.css'
import ArrowIcon from './ArrowIcon'
import classNames from 'classnames/bind'
import Badge from '@shared/atoms/Badge'

const cx = classNames.bind(styles)

export default function Accordion({
  title,
  defaultExpanded = false,
  badgeNumber,
  compact,
  rightContent,
  titleClassName,
  action,
  children
}: {
  title: ReactNode
  defaultExpanded?: boolean
  badgeNumber?: number
  compact?: boolean
  rightContent?: ReactNode
  titleClassName?: string
  action?: ReactNode
  children: ReactNode
}): ReactElement {
  const [open, setOpen] = useState(!!defaultExpanded)
  const headingClassName = compact ? styles.compactTitle : styles.title
  const showSummary =
    !open && rightContent !== undefined && rightContent !== null

  function handleClick() {
    setOpen(!open)
  }

  return (
    <div className={cx({ actions: true, open })}>
      <h3
        className={`${headingClassName} ${titleClassName || ''}`}
        onClick={handleClick}
      >
        <span className={styles.titleContent}>
          <span className={styles.titleText}>{title}</span>
          {badgeNumber > 0 && (
            <Badge label={badgeNumber} className={styles.badge} />
          )}
        </span>
        {showSummary && (
          <span className={styles.headerLeader} aria-hidden="true" />
        )}
        <span
          className={`${styles.titleControls} ${
            showSummary ? '' : styles.titleControlsRight
          }`}
        >
          {showSummary && (
            <span className={styles.titleRight}>{rightContent}</span>
          )}
          <Button
            type="button"
            style="text"
            size="small"
            onClick={(event) => {
              event.stopPropagation()
              handleClick()
            }}
            className={styles.toggle}
          >
            <ArrowIcon className={cx({ arrow: true, arrowOpen: open })} />{' '}
          </Button>
        </span>
      </h3>
      {action}
      <div className={cx({ content: true, compactContent: compact })}>
        {children}
      </div>
    </div>
  )
}
