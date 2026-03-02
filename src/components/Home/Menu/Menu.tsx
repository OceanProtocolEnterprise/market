import { ReactElement } from 'react'
import Link from 'next/link'
import loadable from '@loadable/component'
import Logo from '@shared/atoms/Logo'
import Networks from '../../Header/UserPreferences/Networks'
import styles from './index.module.css'
import UserPreferences from '../../Header/UserPreferences'
import { SsiWallet } from './SsiWallet'
import { getAllowedChainIdsFromNodeUriMap } from '@utils/allowedChains'
const Wallet = loadable(() => import('../../Header/Wallet'))

export default function Menu(): ReactElement {
  const allowedChainIds = getAllowedChainIdsFromNodeUriMap()

  return (
    <nav className={styles.menu}>
      <Link href="/" className={styles.logo}>
        <Logo />
      </Link>
      <div className={styles.demoText}>Demonstration MarketPlace</div>
      <div className={styles.actions}>
        {allowedChainIds.length > 1 && <Networks />}
        <UserPreferences />
        <Wallet />
        <SsiWallet />
      </div>
    </nav>
  )
}
