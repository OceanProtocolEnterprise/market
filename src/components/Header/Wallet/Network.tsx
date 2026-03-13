import { ReactElement } from 'react'
import Status from '@shared/atoms/Status'
import Badge from '@shared/atoms/Badge'
import Tooltip from '@shared/atoms/Tooltip'
import NetworkName from '@shared/NetworkName'
import styles from './Network.module.css'
import useNetworkMetadata from '@hooks/useNetworkMetadata'
import useAllowedWalletChain from '@hooks/useAllowedWalletChain'

export default function Network(): ReactElement {
  const { chainId } = useAllowedWalletChain()
  const { isTestnet, isSupportedOceanNetwork } = useNetworkMetadata(chainId)

  return chainId ? (
    <div className={styles.network}>
      {!isSupportedOceanNetwork && (
        <Tooltip content="No Ocean Protocol contracts are deployed to this network.">
          <Status state="error" className={styles.warning} />
        </Tooltip>
      )}
      <NetworkName className={styles.name} networkId={chainId} minimal />
      {isTestnet && <Badge label="Test" className={styles.badge} />}
    </div>
  ) : null
}
