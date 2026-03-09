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
import NetworkWarningModal from './NetworkWarningModal'
import SsiWalletManager from '@components/Header/SsiWallet/SsiWalletManager'

import contentPurgatory from '../../../content/purgatory.json'
import styles from './index.module.css'

export default function App({
  children
}: {
  children: ReactElement
}): ReactElement {
  const {
    siteContent,
    appConfig,
    validatedSupportedChains,
    isValidatingSupportedChains
  } = useMarketMetadata()
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
  const supportedChains = validatedSupportedChains
  const supportedChainsLoaded = !isValidatingSupportedChains

  const decisionLockedRef = useRef(false)
  const toastShownRef = useRef(false)

  let isNetworkSupported = true
  const isInSupportedChains = chainId
    ? supportedChains.includes(chainId)
    : false
  const requiresTokenApprovalCheck = Boolean(
    isConnected && chainId && isInSupportedChains
  )
  const tokenApprovalReady = !requiresTokenApprovalCheck
    ? true
    : Boolean(enterpriseFeeCollector) && !loading

  if (isConnected && chainId) {
    const hasApprovedToken = allowedTokens.length > 0

    isNetworkSupported = isInSupportedChains && hasApprovedToken
  }

  useEffect(() => {
    if (!isConnected) {
      setShowNetworkWarning(false)
      return
    }

    if (!chainId) {
      setShowNetworkWarning(false)
      return
    }

    if (!supportedChainsLoaded) {
      setShowNetworkWarning(false)
      return
    }

    if (!tokenApprovalReady) {
      setShowNetworkWarning(false)
      return
    }

    if (!isNetworkSupported) {
      setShowNetworkWarning(true)
    } else {
      setShowNetworkWarning(false)
    }
  }, [
    isConnected,
    chainId,
    isNetworkSupported,
    allowedTokens,
    tokenApprovalReady,
    supportedChainsLoaded
  ])

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
    switchChain({ chainId: targetChainId })
  }

  return (
    <div className={styles.app}>
      {siteContent?.announcement && (
        <AnnouncementBanner text={siteContent.announcement} />
      )}

      {!isRoot && <Header />}

      <NetworkWarningModal
        chainId={chainId}
        isOpen={showNetworkWarning}
        isPending={isPending}
        supportedChains={supportedChains}
        onClose={() => setShowNetworkWarning(false)}
        onSwitchChain={handleNetworkSwitch}
      />

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

      <SsiWalletManager />

      {appConfig?.privacyPreferenceCenter === 'true' && (
        <PrivacyPreferenceCenter style="small" />
      )}

      <ToastContainer position="bottom-right" newestOnTop />
    </div>
  )
}
