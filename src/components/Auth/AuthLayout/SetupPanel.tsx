import { useAccount } from 'wagmi'
import { useModal } from 'connectkit'
import appConfig from 'app.config.cjs'
import { useSsiWallet } from '@context/SsiWallet'
import useSsiAllowedChain from '@hooks/useSsiAllowedChain'
import useSsiChainGuard from '@hooks/useSsiChainGuard'
import { useAuth } from '@hooks/useAuth'
import { getPendingAuthMode } from '@utils/authFlow'
import useSsiConnect from '@hooks/useSsiConnect'
import { useDfnsConnect } from '@hooks/useDfnsConnect'
import { useSignerServerConnect } from '@hooks/useSignerServerConnect'
import DfnsRegistrationModal from '@shared/DfnsRegistrationModal'
import { authSetupCopy } from '../constants'
import styles from './SetupPanel.module.css'

type StepStatus = 'complete' | 'active' | 'pending'
type SetupAction = 'connectWallet' | 'switchNetwork' | 'connectSsi' | null

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
  const { user, logout } = useAuth()
  const dfns = useDfnsConnect()
  const signerServer = useSignerServerConnect()
  const { connectSsi } = useSsiConnect()
  const { sessionToken, isSsiStateHydrated, isSsiSessionHydrating } =
    useSsiWallet()
  const { isSsiChainAllowed, isSsiChainReady } = useSsiAllowedChain()
  const { ensureAllowedChainForSsi } = useSsiChainGuard()
  const authMode = getPendingAuthMode()
  const isSsiEnabled = appConfig.ssiEnabled

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
                  className={styles.actionButton}
                  onClick={dfns.openConnect}
                  disabled={dfns.isConnecting}
                >
                  {dfns.isConnecting
                    ? authSetupCopy.dfnsConnecting
                    : authSetupCopy.connectDfnsWallet}
                </button>
                {signerServer.isConfigured && (
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={signerServer.openConnect}
                    disabled={signerServer.isConnecting}
                  >
                    {signerServer.isConnecting
                      ? authSetupCopy.signerServerConnecting
                      : authSetupCopy.connectSignerServer}
                  </button>
                )}
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

      <DfnsRegistrationModal
        isOpen={dfns.isRegistrationModalOpen}
        registrationCode={dfns.registrationCode}
        isConnecting={dfns.isConnecting}
        onChange={dfns.setRegistrationCode}
        onSubmit={dfns.submitRegistrationCode}
        onClose={() => dfns.setIsRegistrationModalOpen(false)}
      />
    </div>
  )
}
