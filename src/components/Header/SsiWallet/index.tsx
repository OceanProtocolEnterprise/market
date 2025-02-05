import Button from '@components/@shared/atoms/Button'
import { useSsiWallet } from '@context/SsiWallet'
import appConfig from 'app.config'
import { ReactElement, useCallback, useEffect, useRef, useState } from 'react'
import styles from './index.module.css'
import { SsiKeyDesc, SsiWalletDesc } from 'src/@types/SsiWallet'
import {
  connectToWallet,
  getWalletKeys,
  getWallets
} from '@utils/wallet/ssiWallet'
import { LoggerInstance } from '@oceanprotocol/lib'
import { useAccount, useSigner } from 'wagmi'

export function SsiWallet(): ReactElement {
  const {
    sessionToken,
    setSessionToken,
    selectedWallet,
    setSelectedWallet,
    selectedKey,
    setSelectedKey
  } = useSsiWallet()

  const [ssiWallets, setSsiWallets] = useState<SsiWalletDesc[]>([])
  const [ssiKeys, setSsiKey] = useState<SsiKeyDesc[]>([])

  const selectorDialog = useRef<HTMLDialogElement>(null)

  const { isConnected } = useAccount()
  const { data: signer } = useSigner()

  const fetchWallets = useCallback(async () => {
    try {
      const wallets = await getWallets()
      setSelectedWallet(selectedWallet || wallets[0])
      setSsiWallets(wallets)
    } catch (error) {
      LoggerInstance.error(error)
    }
  }, [setSelectedWallet, selectedWallet])

  const fetchKeys = useCallback(async () => {
    if (!selectedWallet) {
      return
    }

    try {
      const keys = await getWalletKeys(selectedWallet)
      setSsiKey(keys)
      setSelectedKey(selectedKey || keys[0])
    } catch (error) {
      LoggerInstance.error(error)
    }
  }, [selectedWallet, setSelectedKey, selectedKey])

  useEffect(() => {
    if (!sessionToken) {
      return
    }

    if (!selectedWallet) {
      fetchWallets()
    }
    if (!selectedKey) {
      fetchKeys()
    }
  }, [sessionToken, selectedWallet, selectedKey, fetchWallets, fetchKeys])

  async function handleOpenDialog() {
    selectorDialog.current.showModal()

    fetchWallets()
    fetchKeys()
  }

  function handleCloseDialog() {
    selectorDialog.current.close()
  }

  function handleWalletSelection(event: any) {
    const result = ssiWallets.find(
      (wallet) => wallet.id === (event.target.value as string)
    )
    setSelectedWallet(result)
  }

  function handleKeySelection(event: any) {
    const result = ssiKeys.find(
      (key) => key.keyId.id === (event.target.value as string)
    )
    setSelectedKey(result)
  }

  async function handleReconnection() {
    if (!sessionToken && isConnected && signer) {
      try {
        const session = await connectToWallet(signer)
        setSessionToken(session)
      } catch (error) {
        LoggerInstance.error(error)
      }
    }
  }

  return (
    <>
      {appConfig.ssiEnabled ? (
        <>
          <dialog
            id="ssiWallet"
            ref={selectorDialog}
            className={styles.dialogBorder}
          >
            <div className={styles.panelColumn}>
              <h3>SSI Wallets & Keys</h3>

              <label htmlFor="ssiWallets" className={styles.marginBottom7px}>
                Choose your wallet:
              </label>
              <select
                value={selectedWallet}
                id="ssiWallets"
                className={`${styles.marginBottom2} ${styles.padding1} ${styles.inputField}`}
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

              <label htmlFor="ssiKeys" className={styles.marginBottom7px}>
                Choose your signing key:
              </label>
              <select
                value={selectedKey}
                id="ssiKeys"
                className={`${styles.marginBottom3} ${styles.padding1} ${styles.inputField}`}
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
                className={`${styles.width100p} ${styles.closeButton}`}
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
            <button
              className={`${styles.ssiPanel} ${styles.disconnected}`}
              disabled={!(isConnected && signer)}
              onClick={handleReconnection}
            >
              {isConnected && signer ? (
                <>Reconnect SSI Wallet</>
              ) : (
                <>SSI Wallet</>
              )}
            </button>
          )}
        </>
      ) : (
        <></>
      )}
    </>
  )
}
