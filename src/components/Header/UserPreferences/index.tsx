import { ReactElement } from 'react'
import Tooltip from '@shared/atoms/Tooltip'
import styles from './index.module.css'
import Debug from './Debug'
import ExternalContent from './ExternalContent'
import { CaretIcon, CogIcon } from '@components/@shared/Icons'

export default function UserPreferences(): ReactElement {
  return (
    <Tooltip
      content={
        <ul className={styles.preferencesDetails}>
          <li>
            <ExternalContent />
          </li>
          <li>
            <Debug />
          </li>
        </ul>
      }
      trigger="click focus mouseenter"
      className={styles.preferences}
    >
      <>
        <CogIcon aria-label="Preferences" className={styles.icon} />
        <CaretIcon aria-hidden="true" className={styles.caret} />
      </>
    </Tooltip>
  )
}
