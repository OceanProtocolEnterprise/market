import { ReactElement } from 'react'
import styles from './index.module.css'
import {
  EthIcon,
  PolygonIcon,
  MoonbeamIcon,
  BscIcon,
  EnergywebIcon,
  OptimismIcon
} from '../Icons'

export function NetworkIcon({ name }: { name: string }): ReactElement {
  const IconMapped = name.includes('ETH')
    ? EthIcon
    : name.includes('Polygon') || name.includes('Mumbai')
    ? PolygonIcon
    : name.includes('Moon')
    ? MoonbeamIcon
    : name.includes('BSC')
    ? BscIcon
    : name.includes('Energy Web')
    ? EnergywebIcon
    : name.includes('OP Mainnet')
    ? OptimismIcon
    : EthIcon // ETH icon as fallback

  return <IconMapped className={styles.icon} />
}
