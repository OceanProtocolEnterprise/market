import { ReactElement, useEffect, useMemo } from 'react'
import InputElement from '@components/@shared/FormInput/InputElement'
import styles from './index.module.css'
import { useProfile } from '@context/Profile'
import { useMarketMetadata } from '@context/MarketMetadata'

export default function TokenSelector({
  selectedToken,
  onTokenChange
}: {
  selectedToken?: string
  onTokenChange: (token: string) => void
}): ReactElement {
  const { revenue, escrowFundsByToken } = useProfile()
  const { approvedBaseTokens } = useMarketMetadata()

  const availableTokens = useMemo(() => {
    const tokens = new Set<string>()
    approvedBaseTokens?.forEach((token) => tokens.add(token.symbol))
    Object.keys(revenue || {}).forEach((symbol) => tokens.add(symbol))
    Object.keys(escrowFundsByToken || {}).forEach((symbol) =>
      tokens.add(symbol)
    )
    const tokenArray = Array.from(tokens)
    // Sort with OCEAN first, then alphabetically
    return tokenArray.sort((a, b) => {
      if (a === 'OCEAN') return -1
      if (b === 'OCEAN') return 1
      return a.localeCompare(b)
    })
  }, [approvedBaseTokens, revenue, escrowFundsByToken])

  useEffect(() => {
    const firstToken = availableTokens[0]
    if (
      firstToken &&
      (!selectedToken || !availableTokens.includes(selectedToken))
    ) {
      onTokenChange(firstToken)
    }
  }, [availableTokens, selectedToken, onTokenChange])

  if (availableTokens.length === 0) {
    return (
      <div className={styles.selectorColumn}>
        <div className={styles.tokenPlaceholder}>
          No tokens detected for this profile.
        </div>
      </div>
    )
  }

  const value =
    (selectedToken && availableTokens.includes(selectedToken)
      ? selectedToken
      : availableTokens[0]) || ''

  return (
    <div className={styles.selectorColumn}>
      <div className={styles.selectorLabel}>Select a token</div>
      <InputElement
        name="tokenSelect"
        type="select"
        options={availableTokens}
        value={value}
        style={{ width: 'auto', minWidth: '8rem', maxWidth: '12rem' }}
        onChange={(e) => onTokenChange((e.target as HTMLSelectElement).value)}
        className={styles.tokenSelect}
      />
    </div>
  )
}
