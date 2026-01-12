import { ReactElement, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { useAccount } from 'wagmi'
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

export default function App({
  children
}: {
  children: ReactElement
}): ReactElement {
  const { siteContent, appConfig } = useMarketMetadata()
  const { address } = useAccount()
  const { isInPurgatory, purgatoryData } = useAccountPurgatory(address)

  const router = useRouter()
  const isRoot = router.pathname === '/'
  const isRouterReady = router.isReady
  const chainId = isRouterReady
    ? Number(router.query.chainId || 11155111)
    : undefined

  const allowedEnvAddresses = useAllowedTokenAddresses(chainId)
  const { enterpriseFeeCollector } = useEnterpriseFeeCollector()

  const { allowedTokens = [], loading } = useTokenApproval(
    enterpriseFeeCollector,
    allowedEnvAddresses
  )
  const [showNoAllowedMessage, setShowNoAllowedMessage] = useState(false)
  const decisionLockedRef = useRef(false)
  const toastShownRef = useRef(false)

  useEffect(() => {
    console.log('[TokenCheck] Unified decision effect', {
      isRouterReady,
      loading,
      chainId,
      enterpriseFeeCollector,
      allowedEnvAddresses,
      allowedTokens,
      allowedTokensLength: allowedTokens.length,
      decisionLocked: decisionLockedRef.current
    })

    if (!isRouterReady) return
    if (!enterpriseFeeCollector) return
    if (loading) return
    if (decisionLockedRef.current) return

    const timer = setTimeout(() => {
      decisionLockedRef.current = true

      if (allowedTokens.length === 0) {
        console.log('[TokenCheck] ❌ FINAL DECISION: NO ALLOWED TOKENS')

        setShowNoAllowedMessage(true)

        if (!toastShownRef.current) {
          toast.error('No allowed token addresses found.')
          toastShownRef.current = true
        }
      } else {
        console.log('[TokenCheck] ✅ FINAL DECISION: ALLOWED TOKENS FOUND')
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
    allowedTokens
  ])

  return (
    <div className={styles.app}>
      {siteContent?.announcement && (
        <AnnouncementBanner text={siteContent.announcement} />
      )}

      {!isRoot && <Header />}
      {showNoAllowedMessage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setShowNoAllowedMessage(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              color: '#000',
              borderRadius: '12px',
              padding: '2.5rem',
              width: '100%',
              maxWidth: '600px',
              textAlign: 'center',
              position: 'relative',
              boxShadow: '0 10px 40px rgba(0,0,0,0.25)'
            }}
          >
            <button
              onClick={() => setShowNoAllowedMessage(false)}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer'
              }}
            >
              ×
            </button>

            <Alert
              title="No Allowed Token Addresses"
              text="No token addresses are currently approved by the Enterprise Fee Collector. Please contact the administrator."
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
