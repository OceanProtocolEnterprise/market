import Button from '@components/@shared/atoms/Button'
import { useSsiWallet } from '@context/SsiWallet'
import appConfig from 'app.config'
import { ReactElement, useRef, useState } from 'react'
import styles from './index.module.css'
import { SsiKeyDesc, SsiWalletDesc } from 'src/@types/SsiWallet'
import { getWalletKeys, getWallets } from '@utils/wallet/ssiWallet'
import { LoggerInstance } from '@oceanprotocol/lib'

export function SsiWallet(): ReactElement {
  const {
    sessionToken,
    selectedWallet,
    setSelectedWallet,
    selectedKey,
    setSelectedKey
  } = useSsiWallet()

  const [ssiWallets, setSsiWallets] = useState<SsiWalletDesc[]>([])
  const [ssiKeys, setSsiKey] = useState<SsiKeyDesc[]>([])

  const selectorDialog = useRef<HTMLDialogElement>(null)

  async function handleOpenDialog() {
    selectorDialog.current.showModal()

    try {
      const wallets = await getWallets()
      if (wallets.length > 0) {
        setSelectedWallet(wallets[0].id)
      }
      setSsiWallets(wallets)

      const keys = await getWalletKeys(wallets[0])
      setSsiKey(keys)
      if (keys.length > 0) {
        setSelectedKey(keys[0].keyId.id)
      }
    } catch (error) {
      LoggerInstance.error(error)
    }
  }

  function handleCloseDialog() {
    selectorDialog.current.close()
  }

  function handleWalletSelection(event: any) {
    setSelectedWallet(event.target.value)
  }

  function handleKeySelection(event: any) {
    setSelectedKey(event.target.value)
  }

  return (
    <>
      {appConfig.ssiEnabled ? (
        <>
          <dialog id="ssiWallet" ref={selectorDialog}>
            <div className={styles.panelColumn}>
              <h3>SSI Wallets & Keys</h3>

              <label htmlFor="ssiWallets" className={styles.marginBottom1}>
                Choose your wallet:
              </label>
              <select
                value={selectedWallet}
                id="ssiWallets"
                className={`${styles.marginBottom2} ${styles.padding1}`}
                onChange={handleWalletSelection}
              >
                {ssiWallets?.map((wallet) => {
                  return (
                    <option key={wallet.id} value={`${wallet.id}`}>
                      {wallet.name}
                    </option>
                  )
                })}
              </select>

              <label htmlFor="ssiKeys" className={styles.marginBottom1}>
                Choose your signing key:
              </label>
              <select
                value={selectedKey}
                id="ssiKeys"
                className={`${styles.marginBottom3} ${styles.padding1}`}
                onChange={handleKeySelection}
              >
                {ssiKeys?.map((keys) => {
                  return (
                    <option
                      key={keys.keyId.id}
                      value={`${keys.keyId.id}`}
                      className={styles.panelRow}
                    >
                      {keys.keyId.id} ({keys.algorithm})
                    </option>
                  )
                })}
              </select>

              <Button
                type="button"
                style="primary"
                size="small"
                className={styles.width100p}
                onClick={handleCloseDialog}
              >
                Close
              </Button>
            </div>
          </dialog>

          {sessionToken ? (
            <>
              <div
                className={`${styles.ssiPanel} ${styles.connected}`}
                onClick={handleOpenDialog}
              >
                SSI Wallet
              </div>
            </>
          ) : (
            <div className={`${styles.ssiPanel} ${styles.disconnected}`}>
              SSI Wallet
            </div>
          )}
        </>
      ) : (
        <></>
      )}
    </>
  )
}
