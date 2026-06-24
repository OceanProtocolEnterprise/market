import { ReactElement } from 'react'
import { useUserPreferences } from '@context/UserPreferences'
import ExplorerLink from '@shared/ExplorerLink'
import NetworkName from '@shared/NetworkName'
import Jellyfish from '@oceanprotocol/art/creatures/jellyfish/jellyfish-grid.svg'
import Copy from '@shared/atoms/Copy'
import Avatar from '@shared/atoms/Avatar'
import styles from './Account.module.css'
import { accountTruncate } from '@utils/wallet'
import { useAddressConfig } from '@hooks/useAddressConfig'
import { useAuth } from '@hooks/useAuth'
import { useConnectorSupportedChains } from '@hooks/useDfnsWalletsByChain'
import { useAccount } from 'wagmi'

export default function Account({
  accountId
}: {
  accountId: string
}): ReactElement {
  const { debug } = useUserPreferences()
  const displayedSupportedChainIds = useConnectorSupportedChains()
  const { verifiedWallets } = useAddressConfig()
  const { user, isAuthenticated, authEnabled } = useAuth()
  const { address: connectedAccountId } = useAccount()

  const isOwnAuthenticatedProfile =
    authEnabled &&
    isAuthenticated &&
    Boolean(user?.id) &&
    Boolean(connectedAccountId) &&
    connectedAccountId.toLowerCase() === accountId.toLowerCase()

  const displayName = isOwnAuthenticatedProfile
    ? user.name
    : verifiedWallets?.[accountId] || accountTruncate(accountId)
  const displayEmail =
    isOwnAuthenticatedProfile && user?.email ? user.email : undefined
  const normalizedDisplayName = displayName?.trim().toLowerCase()
  const normalizedDisplayEmail = displayEmail?.trim().toLowerCase()
  const normalizedUsername = user?.username?.trim().toLowerCase()
  const displayUsername =
    isOwnAuthenticatedProfile &&
    debug === true &&
    user?.username &&
    normalizedUsername !== normalizedDisplayName &&
    normalizedUsername !== normalizedDisplayEmail
      ? user.username
      : undefined

  return (
    <div className={styles.account}>
      <figure className={styles.imageWrap}>
        {accountId ? (
          <Avatar accountId={accountId} className={styles.image} />
        ) : (
          <Jellyfish className={styles.image} />
        )}
      </figure>
      <div>
        <h3 className={styles.name}>{displayName}</h3>
        {displayUsername && (
          <p className={styles.username}>{displayUsername}</p>
        )}
        {displayEmail && <p className={styles.email}>{displayEmail}</p>}

        {accountId && (
          <code className={styles.accountId}>
            {accountId} <Copy text={accountId} />
          </code>
        )}
        <p>
          {accountId &&
            displayedSupportedChainIds.map((value) => (
              <ExplorerLink
                className={styles.explorer}
                networkId={value}
                path={`address/${accountId}`}
                key={value}
              >
                <NetworkName networkId={value} />
              </ExplorerLink>
            ))}
        </p>
      </div>
    </div>
  )
}
