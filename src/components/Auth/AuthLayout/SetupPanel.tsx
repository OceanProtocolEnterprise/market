import { useAccount, useConfig, useConnect } from 'wagmi'
import { useModal } from 'connectkit'
import appConfig from 'app.config.cjs'
import { useSsiWallet } from '@context/SsiWallet'
import useSsiAllowedChain from '@hooks/useSsiAllowedChain'
import useSsiChainGuard from '@hooks/useSsiChainGuard'
import { useAuth } from '@hooks/useAuth'
import { getPendingAuthMode } from '@utils/authFlow'
import { getRuntimeConfig } from '@utils/runtimeConfig'
import useSsiConnect from '@hooks/useSsiConnect'
import {
  DFNS_REGISTRATION_CODE_REQUIRED_MESSAGE,
  dfnsConnector,
  getDfnsSelectableChains,
  getStoredDfnsSelectedChainId,
  storeDfnsSelectedChainId
} from '@utils/wallet/dfnsConnector'
import { authSetupCopy } from '../constants'
import styles from './SetupPanel.module.css'
import { toast } from 'react-toastify'
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react'
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
  const wagmiConfig = useConfig()
  const { setOpen } = useModal()
  const { connectAsync } = useConnect()
  const { user, logout } = useAuth()
  const router = useRouter()
  const [isDfnsConnecting, setIsDfnsConnecting] = useState(false)
  const [isDfnsChainModalOpen, setIsDfnsChainModalOpen] = useState(false)
  const [isDfnsRegistrationModalOpen, setIsDfnsRegistrationModalOpen] =
    useState(false)
  const [dfnsRegistrationCode, setDfnsRegistrationCode] = useState('')
  const [pendingDfnsChainId, setPendingDfnsChainId] = useState<
    number | undefined
  >()
  const { connectSsi } = useSsiConnect()
  const { sessionToken, isSsiStateHydrated, isSsiSessionHydrating } =
    useSsiWallet()
  const { isSsiChainAllowed, isSsiChainReady } = useSsiAllowedChain()
  const { ensureAllowedChainForSsi } = useSsiChainGuard()
  const authMode = getPendingAuthMode()
  const isSsiEnabled = appConfig.ssiEnabled
  const dfnsOrganizationId =
    user?.organizationId || getRuntimeConfig().NEXT_PUBLIC_DFNS_ORG_ID
  const dfnsChains = useMemo(
    () => getDfnsSelectableChains(wagmiConfig.chains),
    [wagmiConfig.chains]
  )

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
    const data = (await response.json().catch(() => ({}))) as {
      ssoRedirectUrl?: string
      error?: string
    }

    if (!response.ok || !data.ssoRedirectUrl) {
      throw new Error(data.error || 'Failed to start Dfns SSO login.')
    }

    window.location.assign(data.ssoRedirectUrl)
  }, [dfnsOrganizationId])

  const handleDfnsConnect = useCallback(
    async (chainId?: number, registrationCode?: string) => {
      setIsDfnsConnecting(true)
      try {
        if (chainId) storeDfnsSelectedChainId(chainId)

        await connectAsync({
          allowRegistrationCodePrompt: false,
          connector: dfnsConnector(),
          chainId,
          registrationCode,
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

        if (
          error instanceof Error &&
          error.message === DFNS_REGISTRATION_CODE_REQUIRED_MESSAGE
        ) {
          setPendingDfnsChainId(chainId || getStoredDfnsSelectedChainId())
          setDfnsRegistrationCode('')
          setIsDfnsRegistrationModalOpen(true)
          return
        }

        toast.error(
          error instanceof Error ? error.message : 'Dfns wallet failed.'
        )
      } finally {
        setIsDfnsConnecting(false)
      }
    },
    [
      connectAsync,
      dfnsOrganizationId,
      startDfnsSso,
      user?.email,
      user?.username
    ]
  )

  const submitDfnsRegistrationCode = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      const registrationCode = dfnsRegistrationCode.trim()
      if (!registrationCode) return
      setIsDfnsRegistrationModalOpen(false)
      handleDfnsConnect(
        pendingDfnsChainId || getStoredDfnsSelectedChainId(),
        registrationCode
      ).catch((error) => {
        console.error('Dfns wallet setup failed:', error)
      })
    },
    [dfnsRegistrationCode, handleDfnsConnect, pendingDfnsChainId]
  )

  const openDfnsConnect = useCallback(() => {
    const storedChainId = getStoredDfnsSelectedChainId()
    if (
      storedChainId &&
      dfnsChains.some((chain) => chain.id === storedChainId)
    ) {
      handleDfnsConnect(storedChainId).catch((error) => {
        console.error('Dfns wallet setup failed:', error)
      })
      return
    }

    if (dfnsChains.length > 1) {
      setIsDfnsChainModalOpen(true)
      return
    }

    handleDfnsConnect(dfnsChains[0]?.id).catch((error) => {
      console.error('Dfns wallet setup failed:', error)
    })
  }, [dfnsChains, handleDfnsConnect])

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

    handleDfnsConnect(getStoredDfnsSelectedChainId()).catch((error) => {
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
                  onClick={openDfnsConnect}
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

      {isDfnsChainModalOpen && (
        <div
          className={styles.chainModalBackdrop}
          onClick={() => setIsDfnsChainModalOpen(false)}
        >
          <div
            className={styles.chainModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dfns-chain-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.chainModalHeader}>
              <div>
                <h3 id="dfns-chain-title" className={styles.chainModalTitle}>
                  Select Dfns network
                </h3>
                <p className={styles.chainModalDescription}>
                  Choose the network for your Dfns wallet.
                </p>
              </div>
              <button
                type="button"
                className={styles.chainModalClose}
                aria-label="Close network selector"
                onClick={() => setIsDfnsChainModalOpen(false)}
              >
                x
              </button>
            </div>
            <div className={styles.chainList}>
              {dfnsChains.map((chain) => (
                <button
                  key={chain.id}
                  type="button"
                  className={styles.chainOption}
                  onClick={() => {
                    setIsDfnsChainModalOpen(false)
                    handleDfnsConnect(chain.id).catch((error) => {
                      console.error('Dfns wallet setup failed:', error)
                    })
                  }}
                >
                  <span className={styles.chainName}>{chain.name}</span>
                  <span className={styles.chainId}>Chain ID {chain.id}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isDfnsRegistrationModalOpen && (
        <div
          className={styles.chainModalBackdrop}
          onClick={() => setIsDfnsRegistrationModalOpen(false)}
        >
          <form
            className={styles.chainModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dfns-registration-title"
            onClick={(event) => event.stopPropagation()}
            onSubmit={submitDfnsRegistrationCode}
          >
            <div className={styles.chainModalHeader}>
              <div>
                <h3
                  id="dfns-registration-title"
                  className={styles.chainModalTitle}
                >
                  Enter registration code
                </h3>
                <p className={styles.chainModalDescription}>
                  Use the Dfns registration code for this account.
                </p>
              </div>
              <button
                type="button"
                className={styles.chainModalClose}
                aria-label="Close registration code dialog"
                onClick={() => setIsDfnsRegistrationModalOpen(false)}
              >
                x
              </button>
            </div>
            <div className={styles.registrationForm}>
              <label
                className={styles.registrationLabel}
                htmlFor="dfns-registration-code"
              >
                Registration code
              </label>
              <input
                id="dfns-registration-code"
                className={styles.registrationInput}
                value={dfnsRegistrationCode}
                onChange={(event) =>
                  setDfnsRegistrationCode(event.target.value)
                }
                autoComplete="one-time-code"
                autoFocus
              />
              <div className={styles.registrationActions}>
                <button
                  type="button"
                  className={styles.registrationCancel}
                  onClick={() => setIsDfnsRegistrationModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.registrationSubmit}
                  disabled={!dfnsRegistrationCode.trim() || isDfnsConnecting}
                >
                  {isDfnsConnecting ? 'Connecting...' : 'Continue'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
