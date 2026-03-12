import { ReactElement } from 'react'
import { useUserPreferences } from '@context/UserPreferences'
import { useSsiWallet } from '@context/SsiWallet'
import Input from '@shared/FormInput'
import Loader from '@shared/atoms/Loader'
import useSsiChainGuard from '@hooks/useSsiChainGuard'
import styles from './SsiWalletApiOption.module.css'

export default function SsiWalletApiOption(): ReactElement {
  const { showSsiWalletModule, setShowSsiWalletModule } = useUserPreferences()
  const { isSsiSessionHydrating } = useSsiWallet()
  const { ensureAllowedChainForSsi } = useSsiChainGuard()

  function handleToggleSsiWalletModal() {
    if (showSsiWalletModule) {
      setShowSsiWalletModule(false)
      return
    }

    if (!ensureAllowedChainForSsi()) return

    setShowSsiWalletModule(true)
  }

  return (
    <Input
      label="Ssi Wallet API"
      help="Set a new SSI wallet API."
      name="ssiWalletApi"
      type="checkbox"
      options={['Update SSI Wallet API']}
      checked={showSsiWalletModule}
      disabled={isSsiSessionHydrating}
      onChange={handleToggleSsiWalletModal}
      additionalComponent={
        isSsiSessionHydrating ? (
          <div className={styles.loadingRow}>
            <Loader variant="primary" noMargin />
            <span>Connecting SSI...</span>
          </div>
        ) : undefined
      }
    />
  )
}
