import { ReactElement, useEffect, useState } from 'react'
import Status from '@shared/atoms/Status'
import styles from './index.module.css'
import WalletNetworkSwitcher from '../WalletNetworkSwitcher'
import Warning from '@images/warning.svg'
import { useModal } from 'connectkit'
import useSsiAutoConnectPrompt from '@hooks/useSsiAutoConnectPrompt'

export default function Web3Feedback({
  accountId,
  isAssetNetwork
}: {
  accountId: string
  isAssetNetwork?: boolean
}): ReactElement {
  const [state, setState] = useState<string>()
  const [title, setTitle] = useState<string>()
  const [message, setMessage] = useState<string>()
  const [showFeedback, setShowFeedback] = useState<boolean>(false)

  const { setOpen } = useModal()
  useSsiAutoConnectPrompt()

  function handleConnectWallet() {
    setOpen(true)
  }

  useEffect(() => {
    setShowFeedback(!accountId || isAssetNetwork === false)
    if (accountId && isAssetNetwork) return
    if (!accountId) {
      setState('error')
      setTitle('No account connected')
      setMessage('Please connect your wallet.')
    } else if (isAssetNetwork === false) {
      setState('error')
      setTitle('Not connected to asset network')
      setMessage('Please connect your wallet.')
    } else {
      setState('warning')
      setTitle('Something went wrong.')
      setMessage('Something went wrong.')
    }
  }, [accountId, isAssetNetwork])

  return (
    <>
      {showFeedback && (
        <section className={styles.feedback}>
          <Status state={state} aria-hidden />
          <div className={styles.warningImage}>
            <Warning />
          </div>
          <h3 className={styles.title}>{title}</h3>
          {isAssetNetwork === false ? (
            <WalletNetworkSwitcher />
          ) : (
            message && (
              <span className={styles.error} onClick={handleConnectWallet}>
                {message}
              </span>
            )
          )}
        </section>
      )}
    </>
  )
}
