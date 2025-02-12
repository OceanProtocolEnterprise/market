import { ReactElement } from 'react'
import styles from './index.module.css'
import { OceanLogoIcon } from '@components/@shared/Icons'

export default function Logo(): ReactElement {
  return <OceanLogoIcon className={styles.logo} />
}
