import { useAccount, useConnect } from 'wagmi'
import { useModal } from 'connectkit'
import appConfig from 'app.config.cjs'
import { useSsiWallet } from '@context/SsiWallet'
import useSsiAllowedChain from '@hooks/useSsiAllowedChain'
import useSsiChainGuard from '@hooks/useSsiChainGuard'
import { useAuth } from '@hooks/useAuth'
import { getPendingAuthMode } from '@utils/authFlow'
import { getRuntimeConfig } from '@utils/runtimeConfig'
import useSsiConnect from '@hooks/useSsiConnect'
import { dfnsConnector } from '@utils/wallet/dfnsConnector'
import { authSetupCopy } from '../constants'
import styles from './SetupPanel.module.css'
import { toast } from 'react-toastify'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/router'

type StepStatus = 'complete' | 'active' | 'pending'
type SetupAction = 'connectWallet' | 'switchNetwork' | 'connectSsi' | null
const DFNS_RETURN_PATH_KEY = 'dfns_return_path'

interface SetupStepItem {
  title: string
  description: string
  status: StepStatus
}

function SetupStep({
  title,
  description,
  status,
  isLast = false
}: {
  title: string
  description: string
  status: StepStatus
  isLast?: boolean
}) {
  return (
    <div className={`${styles.step} ${isLast ? styles.stepLast : ''}`}>
      <div className={styles.stepRail}>
        <span
          className={`${styles.stepMarker} ${
            status === 'complete'
              ? styles.stepMarkerComplete
              : status === 'active'
              ? styles.stepMarkerActive
              : styles.stepMarkerPending
          }`}
        />
        {!isLast && <span className={styles.stepLine} />}
      </div>
      <div className={styles.stepBody}>
        <div className={styles.stepTitleRow}>
          <h3 className={styles.stepTitle}>{title}</h3>
          <span
            className={`${styles.stepBadge} ${
              status === 'complete'
                ? styles.stepBadgeComplete
                : status === 'active'
                ? styles.stepBadgeActive
                : styles.stepBadgePending
            }`}
          >
            {status === 'complete'
              ? 'Complete'
              : status === 'active'
              ? 'In progress'
              : 'Pending'}
          </span>
        </div>
        <p className={styles.stepDescription}>{description}</p>
      </div>
    </div>
  )
}

function getSetupSubtitle(
  authMode: ReturnType<typeof getPendingAuthMode>,
  isSsiEnabled: boolean
) {
  if (authMode === 'signup') {
    return isSsiEnabled
      ? authSetupCopy.signupSubtitle
      : authSetupCopy.signupWalletOnlySubtitle
  }

  return isSsiEnabled
    ? authSetupCopy.subtitle
    : authSetupCopy.walletOnlySubtitle
}

export default function SetupPanel() {
  const { isConnected } = useAccount()
  const { setOpen } = useModal()
  const { connectAsync } = useConnect()
  const { user, logout } = useAuth()
  const router = useRouter()
  const [isDfnsConnecting, setIsDfnsConnecting] = useState(false)
  const { connectSsi } = useSsiConnect()
  const { sessionToken, isSsiStateHydrated, isSsiSessionHydrating } =
    useSsiWallet()
  const { isSsiChainAllowed, isSsiChainReady } = useSsiAllowedChain()
  const { ensureAllowedChainForSsi } = useSsiChainGuard()
  const authMode = getPendingAuthMode()
  const isSsiEnabled = appConfig.ssiEnabled
  const dfnsOrganizationId =
    user?.organizationId || getRuntimeConfig().NEXT_PUBLIC_DFNS_ORG_ID

  const isWalletReady = isConnected
  const isSsiReady = Boolean(sessionToken)
  const shouldRequireSsi = isSsiEnabled
  const isSetupReady = shouldRequireSsi
    ? isWalletReady && isSsiStateHydrated && isSsiReady
    : isWalletReady
  const shouldSwitchNetwork =
    isSsiEnabled && isWalletReady && (!isSsiChainReady || !isSsiChainAllowed)
  const subtitle = getSetupSubtitle(authMode, isSsiEnabled)

  const steps: SetupStepItem[] = [
    {
      title: authSetupCopy.ssoStep,
      description: authSetupCopy.ssoMeta,
      status: 'complete'
    },
    {
      title: authSetupCopy.walletStep,
      description: isWalletReady
        ? authSetupCopy.walletComplete
        : authSetupCopy.walletActive,
      status: isWalletReady ? 'complete' : 'active'
    }
  ]

  if (shouldRequireSsi) {
    steps.push({
      title: authSetupCopy.ssiStep,
      description: isSsiReady
        ? authSetupCopy.ssiComplete
        : !isWalletReady
        ? authSetupCopy.ssiPending
        : shouldSwitchNetwork
        ? authSetupCopy.ssiNetwork
        : isSsiSessionHydrating
        ? authSetupCopy.ssiConnecting
        : authSetupCopy.ssiActive,
      status: isSsiReady ? 'complete' : isWalletReady ? 'active' : 'pending'
    })
  }

  const currentAction: SetupAction = !isWalletReady
    ? 'connectWallet'
    : shouldRequireSsi && shouldSwitchNetwork
    ? 'switchNetwork'
    : shouldRequireSsi && !isSsiReady
    ? 'connectSsi'
    : null

  const actionLabel =
    currentAction === 'connectWallet'
      ? authSetupCopy.connectWallet
      : currentAction === 'switchNetwork'
      ? authSetupCopy.switchNetwork
      : currentAction === 'connectSsi'
      ? isSsiSessionHydrating
        ? authSetupCopy.connectingSsi
        : authSetupCopy.connectSsi
      : null

  const handleAction = async () => {
    if (currentAction === 'connectWallet') {
      setOpen(true)
      return
    }

    if (currentAction === 'switchNetwork') {
      ensureAllowedChainForSsi()
      return
    }

    if (currentAction === 'connectSsi') {
      await connectSsi()
    }
  }

  const startDfnsSso = useCallback(async () => {
    sessionStorage.setItem(
      DFNS_RETURN_PATH_KEY,
      `${window.location.pathname}${window.location.search}`
    )
    const response = await fetch('/api/dfns/initiate-sso', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: dfnsOrganizationId
      })
    })
    console.log('response', response, dfnsOrganizationId)
    const data = (await response.json().catch(() => ({}))) as {
      ssoRedirectUrl?: string
      error?: string
    }
    console.log('data', data)

    if (!response.ok || !data.ssoRedirectUrl) {
      throw new Error(data.error || 'Failed to start Dfns SSO login.')
    }

    window.location.assign(data.ssoRedirectUrl)
  }, [dfnsOrganizationId])

  const handleDfnsConnect = useCallback(async () => {
    setIsDfnsConnecting(true)
    try {
      await connectAsync({
        connector: dfnsConnector(),
        username: user?.email || user?.username,
        organizationId: dfnsOrganizationId
      } as Parameters<typeof connectAsync>[0])
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.toLowerCase().includes('dfns sso login')
      ) {
        await startDfnsSso()
        return
      }

      toast.error(
        error instanceof Error ? error.message : 'Dfns wallet failed.'
      )
    } finally {
      setIsDfnsConnecting(false)
    }
  }, [
    connectAsync,
    dfnsOrganizationId,
    startDfnsSso,
    user?.email,
    user?.username
  ])

  useEffect(() => {
    if (!router.isReady || router.query.dfns !== 'success' || isConnected) {
      return
    }

    const returnPath = sessionStorage.getItem(DFNS_RETURN_PATH_KEY)
    if (returnPath) {
      sessionStorage.removeItem(DFNS_RETURN_PATH_KEY)
      const returnUrl = new URL(returnPath, window.location.origin)
      const callbackUrl = returnUrl.searchParams.get('callbackUrl')
      if (callbackUrl && !router.query.callbackUrl) {
        router.replace(
          {
            pathname: router.pathname,
            query: { ...router.query, callbackUrl }
          },
          undefined,
          { shallow: true }
        )
      }
    }

    handleDfnsConnect().catch((error) => {
      console.error('Dfns wallet setup failed:', error)
    })
  }, [
    handleDfnsConnect,
    isConnected,
    router,
    router.isReady,
    router.query.callbackUrl,
    router.query.dfns
  ])

  useEffect(() => {
    if (!router.isReady) return
    const dfnsStatus = router.query.dfns
    if (
      dfnsStatus !== 'missing_auth_params' &&
      dfnsStatus !== 'sso_completion_failed'
    ) {
      return
    }

    toast.error('Dfns SSO login failed. Please try again.')
    const nextQuery = { ...router.query }
    delete nextQuery.dfns
    router.replace(
      {
        pathname: router.pathname,
        query: nextQuery
      },
      undefined,
      { shallow: true }
    )
  }, [router])

  const handleAccountSwitch = () => {
    logout().catch((error) => {
      console.error('Account switch logout failed:', error)
    })
  }

  const greeting = user?.name
    ? `${
        authMode === 'signup'
          ? authSetupCopy.signupGreeting
          : authSetupCopy.greeting
      }, ${user.name}!`
    : authSetupCopy.title

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>{greeting}</h2>
        <p className={styles.subtitle}>{subtitle}</p>
        <p className={styles.accountSwitch}>
          {authSetupCopy.wrongAccount}{' '}
          <button
            type="button"
            className={styles.accountSwitchButton}
            onClick={handleAccountSwitch}
          >
            {authSetupCopy.wrongAccountAction}
          </button>
        </p>
      </div>

      <div className={styles.progressCard}>
        {steps.map((step, index) => (
          <SetupStep
            key={step.title}
            title={step.title}
            description={step.description}
            status={step.status}
            isLast={index === steps.length - 1}
          />
        ))}
      </div>

      <div className={styles.footer}>
        {isSetupReady ? (
          <div className={styles.readyState}>
            <span className={styles.readyDot} />
            <span>{authSetupCopy.redirecting}</span>
          </div>
        ) : (
          <>
            {currentAction === 'connectWallet' ? (
              <div className={styles.walletChoices}>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => setOpen(true)}
                >
                  {authSetupCopy.connectBrowserWallet}
                </button>
                <button
                  type="button"
                  className={`${styles.actionButton} ${styles.secondaryActionButton}`}
                  onClick={() => {
                    handleDfnsConnect().catch((error) => {
                      console.error('Dfns wallet setup failed:', error)
                    })
                  }}
                  disabled={isDfnsConnecting}
                >
                  {isDfnsConnecting
                    ? authSetupCopy.dfnsConnecting
                    : authSetupCopy.connectDfnsWallet}
                </button>
              </div>
            ) : (
              actionLabel && (
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => {
                    handleAction().catch((error) => {
                      console.error('SSI setup action failed:', error)
                    })
                  }}
                  disabled={isSsiSessionHydrating}
                >
                  {actionLabel}
                </button>
              )
            )}
          </>
        )}
      </div>
    </div>
  )
}
