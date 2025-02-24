import Button from '@components/@shared/atoms/Button'
import { useSsiWallet } from '@context/SsiWallet'
import { ReactElement, useCallback, useEffect, useRef, useState } from 'react'
import styles from './index.module.css'
import { SsiKeyDesc, SsiWalletDesc } from 'src/@types/SsiWallet'
import {
  connectToWallet,
  getWalletKeys,
  getWallets,
  isSessionValid
} from '@utils/wallet/ssiWallet'
import { LoggerInstance } from '@oceanprotocol/lib'
import { useAccount, useSigner } from 'wagmi'
import appConfig from 'app.config.cjs'

export function VpSelector(): ReactElement {
  const selectorDialog = useRef<HTMLDialogElement>(null)

  async function handleOpenDialog() {
    selectorDialog.current.showModal()
  }

  return (
    <dialog id="ssiWallet" ref={selectorDialog} className={styles.dialogBorder}>
      <div className={styles.panelColumn}>
        <h3>Verifiable Credentials to present</h3>

        <label htmlFor="ssiWallets" className={styles.marginBottom7px}>
          Choose your VP:
        </label>

        <Button
          style="primary"
          size="small"
          className={`${styles.width100p} ${styles.closeButton}`}
          onClick={() => selectorDialog.current.close()}
        >
          Close
        </Button>
      </div>
    </dialog>
  )
}
