import { ReactElement, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { useAccount, useSwitchChain } from 'wagmi'
import { ToastContainer, toast } from 'react-toastify'

import Alert from '@shared/atoms/Alert'
import AnnouncementBanner from '@shared/AnnouncementBanner'
import PrivacyPreferenceCenter from '../Privacy/PrivacyPreferenceCenter'
import Header from '../Header'
import Footer from '../Footer/Footer'
import { useAccountPurgatory } from '@hooks/useAccountPurgatory'
import { useMarketMetadata } from '@context/MarketMetadata'
import useEnterpriseFeeCollector from '@hooks/useEnterpriseFeeCollector'
import useTokenApproval from '@hooks/useTokenApproval'
import useAllowedTokenAddresses from '@hooks/useAllowedTokenAddresses'

import contentPurgatory from '../../../content/purgatory.json'
import styles from './index.module.css'

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

export default function App({
  children
}: {
  children: ReactElement
}): ReactElement {
  const { siteContent, appConfig } = useMarketMetadata()
  const { address, isConnected, chainId } = useAccount()
  const { switchChain, isPending } = useSwitchChain()
  const { isInPurgatory, purgatoryData } = useAccountPurgatory(address)

  const router = useRouter()
  const isRoot = router.pathname === '/'
  const isRouterReady = router.isReady

  const allowedEnvAddresses = useAllowedTokenAddresses(chainId)
  const { enterpriseFeeCollector } = useEnterpriseFeeCollector()

  const { allowedTokens = [], loading } = useTokenApproval(
    enterpriseFeeCollector,
    allowedEnvAddresses
  )
  const [showNoAllowedMessage, setShowNoAllowedMessage] = useState(false)
  const [showNetworkWarning, setShowNetworkWarning] = useState(false)
  const [supportedChains, setSupportedChains] = useState<number[]>([])

  const decisionLockedRef = useRef(false)
  const toastShownRef = useRef(false)
  const networkWarningShownRef = useRef(false)

  useEffect(() => {
    try {
      const allowedErc20Env =
        process.env.NEXT_PUBLIC_ALLOWED_ERC20_ADDRESSES ||
        (typeof window !== 'undefined' &&
          window.__RUNTIME_CONFIG__?.NEXT_PUBLIC_ALLOWED_ERC20_ADDRESSES)

      if (allowedErc20Env) {
        const parsed = JSON.parse(allowedErc20Env)
        const chains = Object.keys(parsed)
          .filter(
            (chainId) =>
              Array.isArray(parsed[chainId]) && parsed[chainId].length > 0
          )
          .map(Number)
        setSupportedChains(chains)
        console.log('Supported chains from ALLOWED_ERC20_ADDRESSES:', chains)
      }
    } catch (error) {
      console.error(
        'Failed to parse NEXT_PUBLIC_ALLOWED_ERC20_ADDRESSES:',
        error
      )
    }
  }, [])

  console.log('=== App Component Debug ===')
  console.log('1. isConnected:', isConnected)
  console.log('2. chainId from useAccount:', chainId)
  console.log('3. supportedChains from env:', supportedChains)
  console.log('4. allowedEnvAddresses:', allowedEnvAddresses)
  console.log('5. allowedTokens (approved in contract):', allowedTokens)

  let isNetworkSupported = true

  if (isConnected && chainId) {
    const hasApprovedToken = allowedTokens.length > 0
    const isInSupportedChains = supportedChains.includes(chainId)

    isNetworkSupported = isInSupportedChains && hasApprovedToken

    console.log('6. isInSupportedChains:', isInSupportedChains)
    console.log('7. hasApprovedToken:', hasApprovedToken)
  }

  console.log('8. isNetworkSupported:', isNetworkSupported)

  useEffect(() => {
    console.log('=== Network Warning Effect ===')
    console.log('isConnected:', isConnected)
    console.log('chainId from useAccount:', chainId)
    console.log('isNetworkSupported:', isNetworkSupported)
    console.log('allowedTokens length:', allowedTokens.length)

    if (!isConnected) {
      console.log('Not connected, hiding warning')
      setShowNetworkWarning(false)
      networkWarningShownRef.current = false
      return
    }

    if (isConnected && chainId) {
      if (!isNetworkSupported) {
        console.log(`⚠️ Unsupported network detected! Chain ID: ${chainId}`)
        console.log('Setting showNetworkWarning to true')
        setShowNetworkWarning(true)
        networkWarningShownRef.current = true
      } else {
        console.log('Network is supported, hiding warning')
        setShowNetworkWarning(false)
      }
    }
  }, [isConnected, chainId, isNetworkSupported, allowedTokens])

  useEffect(() => {
    if (!isRouterReady) return
    if (!enterpriseFeeCollector) return
    if (loading) return
    if (decisionLockedRef.current) return

    const timer = setTimeout(() => {
      decisionLockedRef.current = true

      if (
        allowedTokens.length === 0 &&
        isConnected &&
        supportedChains.includes(chainId)
      ) {
        setShowNoAllowedMessage(true)

        if (!toastShownRef.current) {
          toast.error('No supported token addresses found for this network.')
          toastShownRef.current = true
        }
      } else {
        setShowNoAllowedMessage(false)
      }
    }, 1200)

    return () => clearTimeout(timer)
  }, [
    isRouterReady,
    loading,
    chainId,
    enterpriseFeeCollector,
    allowedEnvAddresses,
    allowedTokens,
    isConnected,
    supportedChains
  ])

  const handleNetworkSwitch = (targetChainId: number) => {
    console.log('Switching to chain:', targetChainId)
    switchChain({ chainId: targetChainId })
  }

  return (
    <div className={styles.app}>
      {siteContent?.announcement && (
        <AnnouncementBanner text={siteContent.announcement} />
      )}

      {!isRoot && <Header />}

      {showNetworkWarning && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowNetworkWarning(false)}
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px' }}
          >
            <button
              className={styles.modalClose}
              onClick={() => setShowNetworkWarning(false)}
              aria-label="Close"
            >
              ×
            </button>

            <div className={styles.networkWarningContent}>
              <div className={styles.warningIcon}>⚠️</div>
              <h3 className={styles.warningTitle}>Network Not Supported</h3>

              <Alert
                title="Unsupported Network"
                text={`You're connected to ${
                  CHAIN_NAMES[chainId] || `Chain ID: ${chainId}`
                }. This network either has no approved tokens or is not configured for this marketplace.`}
                state="error"
              />

              <p className={styles.warningSubtitle}>
                Please switch to one of the supported networks:
              </p>

              <div className={styles.networkList}>
                {supportedChains.map((id: number) => (
                  <button
                    key={id}
                    onClick={() => handleNetworkSwitch(id)}
                    disabled={isPending}
                    className={styles.networkButton}
                  >
                    {CHAIN_NAMES[id] || `Chain ${id}`}
                    {isPending && ' (switching...)'}
                  </button>
                ))}
              </div>

              <p className={styles.hint}>
                You can also switch networks directly from your wallet
              </p>
            </div>
          </div>
        </div>
      )}

      {showNoAllowedMessage && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowNoAllowedMessage(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.modalClose}
              onClick={() => setShowNoAllowedMessage(false)}
              aria-label="Close"
            >
              ×
            </button>

            <Alert
              title="No Supported Currencies Used"
              text="No currencies approved by O.E.C are used in this market instance. For details on accepted currencies, consult https://docs.oceanenterprise.io/developers/networks#supported-currencies."
              state="error"
            />
          </div>
        </div>
      )}

      {isInPurgatory && (
        <Alert
          title={contentPurgatory.account.title}
          badge={`Reason: ${purgatoryData?.reason}`}
          text={contentPurgatory.account.description}
          state="error"
        />
      )}

      <main className={styles.main}>{children}</main>

      <Footer />

      {appConfig?.privacyPreferenceCenter === 'true' && (
        <PrivacyPreferenceCenter style="small" />
      )}

      <ToastContainer position="bottom-right" newestOnTop />
    </div>
  )
}
