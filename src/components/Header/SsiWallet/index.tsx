import Button from '@components/@shared/atoms/Button'
import { useSsiWallet } from '@context/SsiWallet'
import { ReactElement, useCallback, useEffect, useRef, useState } from 'react'
import styles from './index.module.css'
import {
  SsiKeyDesc,
  SsiVerifiableCredential,
  SsiWalletDesc
} from 'src/@types/SsiWallet'
import {
  connectToWallet,
  getSsiVerifiableCredentialType,
  getWalletKeys,
  getWallets,
  isSessionValid
} from '@utils/wallet/ssiWallet'
import { LoggerInstance } from '@oceanprotocol/lib'
import { useAccount, useSigner } from 'wagmi'
import appConfig from 'app.config.cjs'

export function SsiWallet(): ReactElement {
  const {
    sessionToken,
    setSessionToken,
    selectedWallet,
    setSelectedWallet,
    selectedKey,
    setSelectedKey,
    ssiWalletCache
  } = useSsiWallet()

  const [ssiWallets, setSsiWallets] = useState<SsiWalletDesc[]>([])
  const [ssiKeys, setSsiKey] = useState<SsiKeyDesc[]>([])
  const [ssiWalletCachedCredentials, setSsiWalletCachedCredentials] = useState<
    SsiVerifiableCredential[]
  >([])

  const selectorDialog = useRef<HTMLDialogElement>(null)

  const { isConnected } = useAccount()
  const { data: signer } = useSigner()

  const fetchWallets = useCallback(async () => {
    try {
      const wallets = await getWallets()
      setSelectedWallet(selectedWallet || wallets[0])
      setSsiWallets(wallets)
    } catch (error) {
      setSessionToken(undefined)
      LoggerInstance.error(error)
    }
  }, [selectedWallet])

  const fetchKeys = useCallback(async () => {
    if (!selectedWallet) {
      return
    }
    try {
      const keys = await getWalletKeys(selectedWallet)
      setSsiKey(keys)
      setSelectedKey(selectedKey || keys[0])
    } catch (error) {
      setSessionToken(undefined)
      LoggerInstance.error(error)
    }
  }, [selectedWallet, selectedKey])

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
  }, [sessionToken, selectedWallet, selectedKey])

  async function handleReconnection() {
    const valid = await isSessionValid()
    if ((!valid || !sessionToken) && isConnected && signer) {
      try {
        const session = await connectToWallet(signer)
        setSessionToken(session)
      } catch (error) {
        setSessionToken(undefined)
        LoggerInstance.error(error)
        return false
      }
    }
    return true
  }

  async function handleOpenDialog() {
    const succeed = await handleReconnection()
    if (!succeed) {
      return
    }

    setSsiWalletCachedCredentials(ssiWalletCache.readCredentialStorage())

    selectorDialog.current.showModal()

    fetchWallets()
    fetchKeys()
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

  function handleResetWalletCache() {
    ssiWalletCache.clearCredentials()
    setSsiWalletCachedCredentials(ssiWalletCache.readCredentialStorage())
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
                value={selectedWallet?.id}
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
                value={selectedKey?.keyId.id}
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
                style="primary"
                size="small"
                className={`${styles.width100p} ${styles.closeButton} ${styles.marginBottom2}`}
                onClick={() => selectorDialog.current.close()}
              >
                Close
              </Button>

              <Button
                style="primary"
                size="small"
                className={`${styles.width100p} ${styles.resetButton} ${styles.marginBottom2}`}
                onClick={handleResetWalletCache}
              >
                Reset Wallet Cache
              </Button>

              <div>
                <label>Cached Credentials:</label>
                <ul className={styles.list}>
                  {ssiWalletCachedCredentials.map((credential) => (
                    <li key={credential.id} className={styles.listItem}>
                      {getSsiVerifiableCredentialType(credential)}
                    </li>
                  ))}
                </ul>
              </div>
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
