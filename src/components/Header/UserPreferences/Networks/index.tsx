import { ReactElement } from 'react'
import Label from '@shared/FormInput/Label'
import FormHelp from '@shared/FormInput/Help'
import Tooltip from '@shared/atoms/Tooltip'
import NetworksList from './NetworksList'
import stylesIndex from '../index.module.css'
import styles from './index.module.css'
import useNetworkMetadata, {
  filterNetworksByType
} from '@hooks/useNetworkMetadata'
import { useUserPreferences } from '@context/UserPreferences'
import { useMarketMetadata } from '@context/MarketMetadata'
import { CaretIcon, NetworkIcon } from '@components/@shared/Icons'

export default function Networks(): ReactElement {
  const { appConfig } = useMarketMetadata()
  const { networksList } = useNetworkMetadata()
  const { chainIds } = useUserPreferences()

  const networksMain = filterNetworksByType(
    'mainnet',
    appConfig.chainIdsSupported,
    networksList
  )

  const networksTest = filterNetworksByType(
    'testnet',
    appConfig.chainIdsSupported,
    networksList
  )

  return (
    <Tooltip
      content={
        <ul className={stylesIndex.preferencesDetails}>
          <li>
            <Label htmlFor="chains">Networks</Label>
            <FormHelp>Switch the data source for the interface.</FormHelp>

            <NetworksList title="Main" networks={networksMain} />
            <NetworksList title="Test" networks={networksTest} />
          </li>
        </ul>
      }
      trigger="click focus mouseenter"
      className={`${stylesIndex.preferences} ${styles.networks}`}
    >
      <>
        <NetworkIcon aria-label="Networks" className={stylesIndex.icon} />
        <CaretIcon aria-hidden="true" className={stylesIndex.caret} />

        <div className={styles.chainsSelected}>
          {chainIds.map((chainId) => (
            <span className={styles.chainsSelectedIndicator} key={chainId} />
          ))}
        </div>
      </>
    </Tooltip>
  )
}
