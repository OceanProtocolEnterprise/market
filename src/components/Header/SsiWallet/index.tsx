import { ReactElement } from 'react'
import SsiWalletControl from '@components/@shared/SsiWalletControl'
import styles from './index.module.css'

export function SsiWallet(): ReactElement {
  return (
    <SsiWalletControl
      styles={styles}
      showConnectedToast
      walletRequiredMessage="You need to connect your EVM wallet first"
    />
  )
}
