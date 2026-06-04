import { ReactElement, ReactNode, useState } from 'react'
import { useDisconnect, useAccount } from 'wagmi'
import styles from './Details.module.css'
import Avatar from '@components/@shared/atoms/Avatar'
import Bookmark from '@images/bookmark.svg'
import DisconnectWallet from '@images/disconnect.svg'
import LogoutIcon from '@images/logout.svg'
import Copy from '@shared/atoms/Copy'
import AddTokenList from './AddTokenList'
import { useSsiWallet } from '@context/SsiWallet'
import { disconnectFromWallet } from '@utils/wallet/ssiWallet'
import { LoggerInstance } from '@oceanprotocol/lib'
import { useAuth } from '@hooks/useAuth'
import { useRouter } from 'next/router'
import { useUserPreferences } from '@context/UserPreferences'
import { clearFederatedStorage } from '@utils/logoutRouter'

interface DetailsProps {
  onRequestClose?: () => void
  onRequestWalletChoice?: () => void
}

function formatWalletAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 8)}...${address.slice(-4)}`
}

interface MenuRowProps {
  icon: ReactNode
  label: string
  onClick?: () => void
  disabled?: boolean
  className?: string
}

function MenuRow({
  icon,
  label,
  onClick,
  disabled = false,
  className
}: MenuRowProps): ReactElement {
  return (
    <button
      type="button"
      className={`${styles.menuRow} ${disabled ? styles.menuRowDisabled : ''} ${
        className || ''
      }`}
      onClick={() => {
        if (disabled) return
        onClick?.()
      }}
      disabled={disabled}
    >
      <span className={styles.menuRowIcon}>{icon}</span>
      <span className={styles.menuRowLabel}>{label}</span>
    </button>
  )
}

interface ActionButtonProps {
  icon: ReactNode
  title: string
  description?: string
  onClick: () => void
  tone?: 'default' | 'danger'
  isLoading?: boolean
}

function ActionButton({
  icon,
  title,
  description,
  onClick,
  tone = 'default',
  isLoading = false
}: ActionButtonProps): ReactElement {
  const isDanger = tone === 'danger'
  const hasDescription = Boolean(description)

  return (
    <button
      type="button"
      className={`${styles.actionButton} ${
        isDanger ? styles.actionButtonDanger : ''
      } ${!hasDescription ? styles.actionButtonCompact : ''}`}
      onClick={onClick}
      disabled={isLoading}
    >
      <span
        className={`${styles.actionIconBadge} ${
          isDanger ? styles.actionIconBadgeDanger : ''
        }`}
        aria-hidden="true"
      >
        {isLoading ? <span className={styles.spinner} /> : icon}
      </span>
      <span className={styles.actionContent}>
        <span className={styles.actionTitle}>{title}</span>
        {description && (
          <span className={styles.actionDescription}>{description}</span>
        )}
      </span>
    </button>
  )
}

export default function Details({
  onRequestClose,
  onRequestWalletChoice
}: DetailsProps): ReactElement {
  const { connector: activeConnector, address: accountId } = useAccount()
  const { disconnect } = useDisconnect()
  const { logout, markLogoutPending, isAuthenticated, user, authEnabled } =
    useAuth()
  const router = useRouter()
  const { showOnboardingModule } = useUserPreferences()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const {
    setSessionToken,
    ssiWalletCache,
    setCachedCredentials,
    clearVerifierSessionCache
  } = useSsiWallet()

  async function disconnectSsiWallet() {
    try {
      ssiWalletCache.clearCredentials()
      setCachedCredentials([])
      clearVerifierSessionCache()
      disconnectFromWallet()
      setSessionToken(undefined)
    } catch (error) {
      LoggerInstance.error(error)
    }
  }

  const isWalletConnected = Boolean(accountId)
  const hasMarketplaceSession = authEnabled && isAuthenticated && Boolean(user)
  const walletLabel = activeConnector?.name || 'Web3 wallet disconnected'
  const walletDescription = isWalletConnected
    ? formatWalletAddress(accountId)
    : 'Connect your web3 wallet to restore marketplace actions'
  const showTokenList =
    isWalletConnected && activeConnector?.name === 'MetaMask'
  const showActionDescriptions = showOnboardingModule

  const handleNavigation = async (href: string) => {
    onRequestClose?.()
    await router.push(href)
  }

  const handleConnectWallet = () => {
    onRequestClose?.()
    onRequestWalletChoice?.()
  }

  const handleDisconnectWallet = async () => {
    disconnect()
    // eslint-disable-next-line promise/param-names
    await new Promise((r) => setTimeout(r, 500))
    await disconnectSsiWallet()
  }

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    markLogoutPending()

    try {
      if (isWalletConnected) {
        await handleDisconnectWallet()
      } else {
        await disconnectSsiWallet()
      }
    } catch (error) {
      console.error('wallet logout error', error)
    }

    clearFederatedStorage()
    await logout()
    onRequestClose?.()
    setIsLoggingOut(false)
  }

  return (
    <div className={styles.details}>
      <div className={styles.section}>
        <MenuRow
          icon={
            accountId ? (
              <Avatar accountId={accountId} />
            ) : (
              <span className={styles.placeholderAvatar} aria-hidden="true" />
            )
          }
          label="View Profile"
          onClick={() => handleNavigation('/profile')}
          disabled={!isWalletConnected}
        />
        <MenuRow
          icon={<Bookmark />}
          label="View Bookmarks"
          onClick={() => handleNavigation('/bookmarks')}
          disabled={!isWalletConnected}
          className={styles.bookmarksRow}
        />
      </div>

      <div className={styles.section}>
        <div className={styles.walletInfo}>
          <div className={styles.walletHeading}>{walletLabel}</div>
          {isWalletConnected ? (
            <div className={styles.walletAddressRow}>
              <span className={styles.walletDescription} title={accountId}>
                {walletDescription}
              </span>
              <Copy text={accountId} />
            </div>
          ) : (
            <div className={styles.walletDescription}>{walletDescription}</div>
          )}
          {showTokenList && <AddTokenList disabled={!isWalletConnected} />}
        </div>
      </div>

      <div className={styles.section}>
        <ActionButton
          icon={<DisconnectWallet className={styles.actionGlyph} />}
          title={
            isWalletConnected ? 'Disconnect web3 wallet' : 'Connect web3 wallet'
          }
          description={
            showActionDescriptions
              ? isWalletConnected
                ? 'Stop the active wallet connection for this browser session.'
                : 'Reconnect your wallet to restore web3 actions in the marketplace.'
              : undefined
          }
          onClick={
            isWalletConnected ? handleDisconnectWallet : handleConnectWallet
          }
        />
        {hasMarketplaceSession && (
          <ActionButton
            icon={<LogoutIcon className={styles.actionGlyph} />}
            title="Sign out of marketplace"
            description={
              showActionDescriptions
                ? isWalletConnected
                  ? 'End your marketplace session and disconnect this linked wallet.'
                  : 'End your marketplace session on this browser.'
                : undefined
            }
            onClick={handleLogout}
            tone="danger"
            isLoading={isLoggingOut}
          />
        )}
      </div>

      {hasMarketplaceSession && user && (
        <div className={styles.userInfo}>
          <div className={styles.userEmail}>{user.email}</div>
          <div className={styles.userProvider}>
            Signed in with {user.authProvider}
          </div>
        </div>
      )}
    </div>
  )
}
