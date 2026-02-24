import { ReactElement } from 'react'
import Link from 'next/link'
import loadable from '@loadable/component'
import Logo from '@shared/atoms/Logo'
import Networks from '../../Header/UserPreferences/Networks'
import styles from './index.module.css'
import { useMarketMetadata } from '@context/MarketMetadata'
import UserPreferences from '../../Header/UserPreferences'
import { SsiWallet } from './SsiWallet'
const Wallet = loadable(() => import('../../Header/Wallet'))

export default function Menu(): ReactElement {
  const { appConfig } = useMarketMetadata()

  return (
    <nav className={styles.menu}>
      <Link href="/" className={styles.logo}>
        <Logo />
      </Link>
      <div className={styles.demoText}>Demonstration MarketPlace</div>
      <div className={styles.actions}>
        {appConfig.chainIdsSupported.length > 1 && <Networks />}
        <UserPreferences />
        <Wallet />
        <SsiWallet />
      </div>
    </nav>
  )
}
