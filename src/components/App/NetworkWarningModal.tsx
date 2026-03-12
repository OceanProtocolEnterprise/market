import { useEffect, useState } from 'react'
import Alert from '@shared/atoms/Alert'
import Button from '@shared/atoms/Button'
import Loader from '@shared/atoms/Loader'
import Modal from '@shared/atoms/Modal'
import networkdata from '../../../content/networks-metadata.json'
import {
  getNetworkDataById,
  getNetworkDisplayName
} from '@hooks/useNetworkMetadata'
import styles from './NetworkWarningModal.module.css'

const MODAL_TITLE = 'Network Not Supported'
const ALERT_TITLE = 'Unsupported Network'
const NETWORK_ALERT_SUFFIX =
  'This network either has no approved tokens or is not configured for this marketplace.'
const CONFIG_ALERT_TITLE = 'Configuration Required'
const CONFIG_ALERT_TEXT =
  'NEXT_PUBLIC_ALLOWED_ERC20_ADDRESSES must be set with at least one supported chain and token address.'
const SWITCH_NETWORK_PROMPT = 'Please switch to one of the supported networks:'
const NETWORK_HINT = 'You can also switch networks directly from your wallet'

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum Mainnet',
  10: 'Optimism',
  11155111: 'Ethereum Sepolia',
  11155420: 'OP Sepolia',
  560048: 'Ethereum Hoodi',
  8996: 'Pontus-X Testnet',
  56: 'BNB Smart Chain',
  137: 'Polygon',
  42161: 'Arbitrum',
  43114: 'Avalanche'
}

const networksList: EthereumListsChain[] = networkdata

function getReadableNetworkName(chainId: number): string {
  if (CHAIN_NAMES[chainId]) return `${CHAIN_NAMES[chainId]} (${chainId})`

  const networkData = getNetworkDataById(networksList, chainId)
  const metadataDisplayName = getNetworkDisplayName(networkData)

  if (metadataDisplayName && metadataDisplayName !== 'Unknown') {
    return `${metadataDisplayName} (${chainId})`
  }

  return `Chain ID: ${chainId}`
}

interface NetworkWarningModalProps {
  chainId?: number
  isOpen: boolean
  isPending: boolean
  supportedChains: number[]
  onClose: () => void
  onSwitchChain: (targetChainId: number) => void
}

export default function NetworkWarningModal({
  chainId,
  isOpen,
  isPending,
  supportedChains,
  onClose,
  onSwitchChain
}: NetworkWarningModalProps) {
  const [loadingChainId, setLoadingChainId] = useState<number | null>(null)

  useEffect(() => {
    if (!isPending) setLoadingChainId(null)
  }, [isPending])

  useEffect(() => {
    if (isOpen) return
    setLoadingChainId(null)
  }, [isOpen])

  if (!isOpen) return null

  const hasSupportedChains = supportedChains.length > 0
  const connectedNetworkName = chainId
    ? getReadableNetworkName(chainId)
    : 'an unknown network'
  const alertTitle = hasSupportedChains ? ALERT_TITLE : CONFIG_ALERT_TITLE
  const alertText = hasSupportedChains
    ? `You're connected to ${connectedNetworkName}. ${NETWORK_ALERT_SUFFIX}`
    : CONFIG_ALERT_TEXT

  function handleSwitchClick(targetChainId: number) {
    if (isPending) return

    setLoadingChainId(targetChainId)
    try {
      onSwitchChain(targetChainId)
    } catch {
      setLoadingChainId(null)
    }
  }

  return (
    <Modal
      title={MODAL_TITLE}
      isOpen
      onToggleModal={onClose}
      shouldCloseOnOverlayClick
      className={styles.networkWarningModal}
    >
      <div className={styles.networkWarningContent}>
        <div className={styles.warningIcon}>⚠️</div>

        <Alert title={alertTitle} text={alertText} state="error" />

        {hasSupportedChains && (
          <>
            <p className={styles.warningSubtitle}>{SWITCH_NETWORK_PROMPT}</p>

            <div className={styles.networkList}>
              {supportedChains.map((id: number) => (
                <Button
                  key={id}
                  type="button"
                  style="secondary"
                  onClick={() => handleSwitchClick(id)}
                  disabled={isPending}
                  className={styles.networkSwitchButton}
                >
                  {loadingChainId === id && isPending ? (
                    <Loader
                      variant="primary"
                      noMargin
                      className={styles.buttonLoader}
                    />
                  ) : (
                    getReadableNetworkName(id)
                  )}
                </Button>
              ))}
            </div>

            <p className={styles.hint}>{NETWORK_HINT}</p>
          </>
        )}
      </div>
    </Modal>
  )
}
