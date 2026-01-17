import { ReactElement, useState } from 'react'
import Stats from './Stats'
import Account from './Account'
import styles from './index.module.css'
import TokenSelector from './TokenSelector'

export default function AccountHeader({
  accountId
}: {
  accountId: string
}): ReactElement {
  const [selectedToken, setSelectedToken] = useState<string>('')

  return (
    <div className={styles.grid}>
      <div>
        <Account accountId={accountId} />
        <Stats selectedToken={selectedToken} />
      </div>
      <TokenSelector
        selectedToken={selectedToken}
        onTokenChange={setSelectedToken}
      />
    </div>
  )
}
