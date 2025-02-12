import { ReactElement } from 'react'
import styles from './index.module.css'
import { LogoAssetFullIcon, OceanLogoIcon } from '@components/@shared/Icons'

export interface LogoProps {
  noWordmark?: boolean
}

export default function OceanLogo({ noWordmark }: LogoProps): ReactElement {
  return noWordmark ? (
    <OceanLogoIcon className={styles.logo} />
  ) : (
    <LogoAssetFullIcon className={styles.logo} />
  )
}
