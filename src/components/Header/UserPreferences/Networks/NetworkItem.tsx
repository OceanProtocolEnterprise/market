import { ReactElement } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import Button from '@shared/atoms/Button'
import NetworkName from '@shared/NetworkName'
import { useIsChainSupportedByConnector } from '@hooks/useDfnsWalletsByChain'
import styles from './NetworkItem.module.css'

export default function NetworkItem({
  chainId
}: {
  chainId: number
}): ReactElement {
  const { chainId: connectedChainId } = useAccount()
  const { switchChain, switchChainAsync, isPending } = useSwitchChain()
  const { isSupported, isDfns, reason } =
    useIsChainSupportedByConnector(chainId)

  const isConnected = connectedChainId === chainId
  const isUnavailable = isDfns && !isSupported
  const buttonLabel = isConnected
    ? 'Connected'
    : isUnavailable
    ? 'Unavailable'
    : 'Connect'
  const buttonClassName = isConnected
    ? `${styles.connectButton} ${styles.connectedButton}`
    : styles.connectButton
  const isDisabled = isConnected || isPending || isUnavailable

  async function handleSwitchChain() {
    try {
      if (switchChainAsync) {
        await switchChainAsync({ chainId })
      } else {
        switchChain({ chainId })
      }
    } catch {}
  }

  return (
    <div className={styles.row} title={isUnavailable ? reason : undefined}>
      <div className={styles.networkName}>
        <NetworkName networkId={chainId} />
      </div>

      <Button
        type="button"
        style="outlined"
        size="small"
        disabled={isDisabled}
        className={buttonClassName}
        onClick={!isConnected && !isUnavailable ? handleSwitchChain : undefined}
      >
        {buttonLabel}
      </Button>
    </div>
  )
}
