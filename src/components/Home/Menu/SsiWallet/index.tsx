import { ReactElement } from 'react'
import SsiWalletControl from '@components/@shared/SsiWalletControl'
import styles from './index.module.css'

export function SsiWallet(): ReactElement {
  return (
    <SsiWalletControl
      styles={styles}
      walletRequiredMessage="You need to connect to your wallet first"
    />
  )
}
