import { forwardRef, FormEvent, useEffect } from 'react'
import Caret from '@images/caret.svg'
import { accountTruncate } from '@utils/wallet'
// import Loader from '@shared/atoms/Loader'
import styles from './Account.module.css'
import Avatar from '@shared/atoms/Avatar'
import { useAccount, useSigner } from 'wagmi'
import { useModal } from 'connectkit'
import { connectToWallet, disconnectFromWallet } from '@utils/wallet/ssiWallet'
import { LoggerInstance } from '@oceanprotocol/lib'
import { useSsiWallet } from '@context/SsiWallet'
import appConfig from 'app.config'

// Forward ref for Tippy.js
// eslint-disable-next-line
const Account = forwardRef((props, ref: any) => {
  const { address: accountId, isConnected } = useAccount()
  const { setOpen } = useModal()
  const { setSessionToken } = useSsiWallet()
  const { data: signer } = useSigner()

  async function handleActivation(e: FormEvent<HTMLButtonElement>) {
    // prevent accidentally submitting a form the button might be in
    e.preventDefault()

    setOpen(true)
  }

  useEffect(() => {
    async function handleSsiConnection() {
      try {
        if (signer && isConnected) {
          const session = await connectToWallet(signer)
          setSessionToken(session)
        } else {
          disconnectFromWallet()
          setSessionToken(undefined)
        }
      } catch (error) {
        LoggerInstance.error(error)
      }
    }

    if (!appConfig.ssiEnabled) {
      return
    }

    handleSsiConnection()
  }, [signer, isConnected, setSessionToken])

  return accountId ? (
    <button
      className={styles.button}
      aria-label="Account"
      ref={ref}
      onClick={(e) => e.preventDefault()}
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
      onClick={(e) => handleActivation(e)}
      // Need the `ref` here although we do not want
      // the Tippy to show in this state.
      ref={ref}
    >
      Connect Wallet
    </button>
  )
})

export default Account
