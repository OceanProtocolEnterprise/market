import { ReactElement } from 'react'
import Label from '@shared/FormInput/Label'
import FormHelp from '@shared/FormInput/Help'
import Tooltip from '@shared/atoms/Tooltip'
import Caret from '@images/caret.svg'
import Network from '@images/network.svg'
import NetworksList from './NetworksList'
import stylesIndex from '../index.module.css'
import styles from './index.module.css'
import useNetworkMetadata, {
  filterNetworksByType
} from '@hooks/useNetworkMetadata'
import { useUserPreferences } from '@context/UserPreferences'
import { useMarketMetadata } from '@context/MarketMetadata'

export default function Networks(): ReactElement | null {
  const { validatedSupportedChains, isValidatingSupportedChains } =
    useMarketMetadata()
  const { networksList } = useNetworkMetadata()
  const { chainIds } = useUserPreferences()
  const supportedChainIds = validatedSupportedChains

  if (isValidatingSupportedChains) return null
  if (supportedChainIds.length <= 1) return null

  const networksMain = filterNetworksByType(
    'mainnet',
    supportedChainIds,
    networksList
  )

  const networksTest = filterNetworksByType(
    'testnet',
    supportedChainIds,
    networksList
  )

  return (
    <Tooltip
      content={
        <ul
          className={`${stylesIndex.preferencesDetails} ${styles.preferencesDetails}`}
        >
          <li>
            <Label htmlFor="chains">Networks</Label>
            <FormHelp>Switch the data source for the interface.</FormHelp>

            <NetworksList title="Main" networks={networksMain} />
            <NetworksList title="Test" networks={networksTest} />
          </li>
        </ul>
      }
      trigger="click focus mouseenter"
      contentClassName={styles.tooltipContent}
      className={`${stylesIndex.preferences} ${styles.networks}`}
    >
      <>
        <Network aria-label="Networks" className={stylesIndex.icon} />
        <Caret aria-hidden="true" className={stylesIndex.caret} />

        <div className={styles.chainsSelected}>
          {chainIds.map((chainId) => (
            <span className={styles.chainsSelectedIndicator} key={chainId} />
          ))}
        </div>
      </>
    </Tooltip>
  )
}
