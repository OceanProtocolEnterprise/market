import { forwardRef, useEffect, useState } from 'react'
import Caret from '@images/caret.svg'
import { accountTruncate } from '@utils/wallet'
import styles from './Account.module.css'
import Avatar from '@shared/atoms/Avatar'
import { useAccount } from 'wagmi'
import { useModal } from 'connectkit'
import { useSsiWallet } from '@context/SsiWallet'
import {
  connectToWallet,
  setSsiWalletApiOverride,
  STORAGE_KEY
} from '@utils/wallet/ssiWallet'
import { LoggerInstance } from '@oceanprotocol/lib'
import appConfig from 'app.config.cjs'
import SsiApiModal from './SsiApiModal'
import { useEthersSigner } from '@hooks/useEthersSigner'

interface AccountProps {
  onSsiModalOpenChange?: (isOpen: boolean) => void
}

const Account = forwardRef(
  ({ onSsiModalOpenChange }: AccountProps, ref: any) => {
    const { address: accountId, isConnected } = useAccount()
    const walletClient = useEthersSigner()
    const { setOpen } = useModal()
    const {
      sessionToken,
      setSessionToken,
      tryAcquireSsiAutoConnectLock,
      resetSsiAutoConnectLock
    } = useSsiWallet()

    const [showInput, setShowInput] = useState(false)
    const [overrideApi, setOverrideApi] = useState(appConfig.ssiWalletApi)

    useEffect(() => {
      onSsiModalOpenChange?.(showInput)
    }, [onSsiModalOpenChange, showInput])

    useEffect(() => {
      if (!isConnected) {
        resetSsiAutoConnectLock()
        return
      }
      const storedApi = sessionStorage.getItem(STORAGE_KEY)

      if (
        isConnected &&
        walletClient &&
        appConfig.ssiEnabled &&
        !sessionToken
      ) {
        if (!tryAcquireSsiAutoConnectLock()) return
        if (storedApi) {
          connectToWallet(walletClient as any)
            .then((session) => {
              setSessionToken(session)
            })
            .catch((error) => LoggerInstance.error(error))
        } else {
          setShowInput(true)
        }
      }
    }, [
      isConnected,
      walletClient,
      sessionToken,
      setSessionToken,
      tryAcquireSsiAutoConnectLock,
      resetSsiAutoConnectLock
    ])

    async function handleActivation() {
      setOpen(true)
    }

    async function handleSsiConnect() {
      try {
        if (!walletClient) {
          LoggerInstance.error(
            'Wallet Client not available for SSI connection.'
          )
          return
        }

        setSsiWalletApiOverride(overrideApi)
        const session = await connectToWallet(walletClient as any)
        setSessionToken(session)
        setShowInput(false)
      } catch (error) {
        LoggerInstance.error(error)
      }
    }

    return (
      <>
        <div className={styles.wrapper}>
          {accountId ? (
            <button
              className={`${styles.button}`}
              aria-label="Account"
              ref={ref}
              onClick={(e) => {
                e.preventDefault()
              }}
            >
              <Avatar accountId={accountId} />
              <span className={styles.address} title={accountId}>
                {accountTruncate(accountId)}
              </span>
              <Caret aria-hidden="true" className={styles.caret} />
            </button>
          ) : (
            <button
              className={`${styles.button} ${styles.initial}`}
              onClick={handleActivation}
              ref={ref}
            >
              <span>Connect Wallet</span>
            </button>
          )}
        </div>
        {showInput && (
          <SsiApiModal
            apiValue={overrideApi}
            onChange={setOverrideApi}
            onConnect={handleSsiConnect}
            onClose={() => setShowInput(false)}
          />
        )}
      </>
    )
  }
)

export default Account

Account.displayName = 'Account'
