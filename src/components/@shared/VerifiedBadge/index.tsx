import classNames from 'classnames/bind'
import { ReactElement } from 'react'
import VerifiedPatch from '@images/circle_check.svg'
import Cross from '@images/cross.svg'
import styles from './index.module.css'

const cx = classNames.bind(styles)

export function Badge({
  isValid,
  verifiedService,
  className
}: {
  isValid: boolean
  verifiedService: string
  className?: string
}): ReactElement {
  return (
    <div
      className={cx({
        mainLabel: true,
        isValid,
        [className]: className
      })}
    >
      {isValid ? <VerifiedPatch /> : <Cross />}
      <span>{verifiedService}</span>
    </div>
  )
}
