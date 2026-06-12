import { ReactElement, useEffect, useState } from 'react'
import Status from '@shared/atoms/Status'
import styles from './index.module.css'
import WalletNetworkSwitcher from '../WalletNetworkSwitcher'
import Warning from '@images/warning.svg'
import { useModal } from 'connectkit'
import Tooltip from '@shared/atoms/Tooltip'
import useNetworkMetadata, {
  getNetworkDataById,
  getNetworkDisplayName
} from '@hooks/useNetworkMetadata'
import { useAsset } from '@context/Asset'
import { useChainId } from 'wagmi'

export default function Web3Feedback({
  accountId,
  isAssetNetwork
}: {
  accountId?: string
  isAssetNetwork?: boolean
}): ReactElement {
  const [state, setState] = useState<string>()
  const [title, setTitle] = useState<string>()
  const [message, setMessage] = useState<string>()
  const [showFeedback, setShowFeedback] = useState<boolean>(false)

  const { setOpen } = useModal()

  const chainId = useChainId()
  const { asset } = useAsset()
  const { networksList } = useNetworkMetadata()

  const ddoNetworkId = asset?.credentialSubject?.chainId
  const ddoNetworkData = getNetworkDataById(networksList, ddoNetworkId)
  const walletNetworkData = getNetworkDataById(networksList, chainId)

  const ddoNetworkName = (
    <strong>{getNetworkDisplayName(ddoNetworkData)}</strong>
  )
  const walletNetworkName = (
    <strong>{getNetworkDisplayName(walletNetworkData)}</strong>
  )

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
          {isAssetNetwork === false ? (
            <Tooltip
              content={
                <>
                  This asset is published on {ddoNetworkName} but your wallet is
                  connected to {walletNetworkName}. Connect to {ddoNetworkName}
                  to interact with this asset.
                </>
              }
            >
              <h3 className={styles.title}>{title}</h3>
            </Tooltip>
          ) : (
            <h3 className={styles.title}>{title}</h3>
          )}
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
