import { forwardRef, FormEvent, useEffect } from 'react'
import Caret from '@images/caret.svg'
import { accountTruncate } from '@utils/wallet'
// import Loader from '@shared/atoms/Loader'
import styles from './Account.module.css'
import Avatar from '@shared/atoms/Avatar'
import { useAccount } from 'wagmi'
import { useModal } from 'connectkit'
import {
  connectToSsiWallet,
  disconnectFromSsiWallet,
  getSsiWalletAccessToken
} from '@utils/wallet/ssiWallet'
import { LoggerInstance } from '@oceanprotocol/lib'

// Forward ref for Tippy.js
// eslint-disable-next-line
const Account = forwardRef((props, ref: any) => {
  const { address: accountId } = useAccount()
  const { setOpen } = useModal()

  async function handleActivation(e: FormEvent<HTMLButtonElement>) {
    // prevent accidentally submitting a form the button might be in
    e.preventDefault()

    setOpen(true)
  }

  useEffect(() => {
    if (accountId === undefined) {
      disconnectFromSsiWallet().catch((error) => LoggerInstance.error(error))
    } else {
      connectToSsiWallet()
        .then((result) => console.log(result))
        .catch((error) => LoggerInstance.error(error))
    }
  }, [accountId])

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
