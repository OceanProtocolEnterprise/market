import { ReactElement, useEffect, useState } from 'react'
import styles from './index.module.css'
import Link from 'next/link'
import { accountTruncate } from '@utils/wallet'
import { useIsMounted } from '@hooks/useIsMounted'

interface PublisherProps {
  account: string
  minimal?: boolean
  verifiedServiceProviderName?: string
  className?: string
}

export default function Publisher({
  account,
  minimal,
  verifiedServiceProviderName,
  className
}: PublisherProps): ReactElement {
  const isMounted = useIsMounted()
  const [name, setName] = useState(
    verifiedServiceProviderName || accountTruncate(account)
  )

  useEffect(() => {
    if (!account) return

    if (verifiedServiceProviderName && isMounted()) {
      setName(verifiedServiceProviderName)
    } else {
      setName(accountTruncate(account))
    }
  }, [account, isMounted, verifiedServiceProviderName])

  if (minimal) {
    return <span className={styles.publisher}>{name}</span>
  }

  return (
    <div className={`${styles.publisher} ${className || ''}`}>
      <span className={styles.hoverReveal}>
        <Link
          href={`/profile/${account}`}
          className={styles.truncated}
          title="Show profile page."
        >
          {name}
        </Link>

        <span className={styles.fullValue}>{account}</span>
      </span>
    </div>
  )
}
