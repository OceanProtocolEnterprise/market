import { forwardRef, useEffect } from 'react'
import Caret from '@images/caret.svg'
import { accountTruncate } from '@utils/wallet'
import styles from './Account.module.css'
import Avatar from '@shared/atoms/Avatar'
import { useAccount } from 'wagmi'
import { useModal } from 'connectkit'
import { useUserPreferences } from '@context/UserPreferences'
import useSsiAutoConnectPrompt from '@hooks/useSsiAutoConnectPrompt'

interface AccountProps {
  onSsiModalOpenChange?: (isOpen: boolean) => void
}

const Account = forwardRef<HTMLButtonElement, AccountProps>(
  ({ onSsiModalOpenChange }, ref) => {
    const { address: accountId } = useAccount()
    const { setOpen } = useModal()
    const { showSsiWalletModule } = useUserPreferences()

    useSsiAutoConnectPrompt()

    useEffect(() => {
      onSsiModalOpenChange?.(showSsiWalletModule)
    }, [onSsiModalOpenChange, showSsiWalletModule])

    async function handleActivation() {
      setOpen(true)
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
      </>
    )
  }
)

export default Account

Account.displayName = 'Account'
