import { ReactElement, useEffect, useMemo } from 'react'
import InputElement from '@components/@shared/FormInput/InputElement'
import styles from './index.module.css'
import { useProfile } from '@context/Profile'
import { useMarketMetadata } from '@context/MarketMetadata'
import { useChainId } from 'wagmi'

export const getTokenSelectionValue = (
  symbol: string,
  chainId?: string | number
): string => (chainId ? `${chainId}:${symbol}` : symbol)

export function parseTokenSelection(value?: string): {
  chainId?: string
  symbol: string
} {
  const [chainId, ...symbolParts] = (value || '').split(':')
  if (symbolParts.length === 0) return { symbol: value || '' }
  return { chainId, symbol: symbolParts.join(':') }
}

interface TokenOption {
  value: string
  label: string
  symbol: string
  chainId?: string
}

export default function TokenSelector({
  selectedToken,
  onTokenChange
}: {
  selectedToken?: string
  onTokenChange: (token: string) => void
}): ReactElement {
  const { revenue, revenueByNetwork, escrowFundsByToken } = useProfile()
  const { approvedBaseTokens } = useMarketMetadata()
  const activeChainId = useChainId()
  const activeChainIdString = activeChainId?.toString()

  const availableTokens = useMemo<TokenOption[]>(() => {
    const options = new Map<string, TokenOption>()
    const chainsBySymbol = new Map<string, Set<string>>()

    function addOption(symbol?: string, chainId?: string | number) {
      if (!symbol) return
      const normalizedChainId = chainId?.toString()
      const value = getTokenSelectionValue(symbol, normalizedChainId)
      if (options.has(value)) return
      options.set(value, {
        value,
        label: symbol,
        symbol,
        chainId: normalizedChainId
      })
      if (normalizedChainId) {
        const chains = chainsBySymbol.get(symbol) || new Set<string>()
        chains.add(normalizedChainId)
        chainsBySymbol.set(symbol, chains)
      }
    }

    Object.entries(revenueByNetwork?.[activeChainIdString] || {}).forEach(
      ([symbol, amount]) => {
        if (Number(amount || 0) !== 0) addOption(symbol, activeChainIdString)
      }
    )

    if (!activeChainIdString) {
      Object.entries(revenue || {}).forEach(([symbol, amount]) => {
        if (Number(amount || 0) !== 0 && !chainsBySymbol.has(symbol)) {
          addOption(symbol)
        }
      })
    }

    Object.keys(escrowFundsByToken || {}).forEach((symbol) =>
      addOption(symbol, activeChainIdString)
    )
    approvedBaseTokens?.forEach((token) =>
      addOption(token.symbol, activeChainIdString)
    )

    return Array.from(options.values()).sort((a, b) => {
      if (a.symbol === 'OCEAN' && b.symbol !== 'OCEAN') return -1
      if (b.symbol === 'OCEAN' && a.symbol !== 'OCEAN') return 1
      const symbolSort = a.symbol.localeCompare(b.symbol)
      if (symbolSort !== 0) return symbolSort
      return (a.chainId || '').localeCompare(b.chainId || '')
    })
  }, [
    activeChainIdString,
    approvedBaseTokens,
    escrowFundsByToken,
    revenue,
    revenueByNetwork
  ])

  const availableValues = useMemo(
    () => availableTokens.map(({ value }) => value),
    [availableTokens]
  )

  useEffect(() => {
    const firstToken = availableTokens[0]?.value
    if (
      firstToken &&
      (!selectedToken || !availableValues.includes(selectedToken))
    ) {
      onTokenChange(firstToken)
    }
  }, [availableTokens, availableValues, selectedToken, onTokenChange])

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
    (selectedToken && availableValues.includes(selectedToken)
      ? selectedToken
      : availableTokens[0]?.value) || ''

  return (
    <div className={styles.selectorColumn}>
      <div className={styles.selectorLabel}>Select a token</div>
      <InputElement
        name="tokenSelect"
        type="select"
        options={availableTokens.map(({ value }) => value)}
        optionTitles={availableTokens.map(({ label }) => label)}
        sortOptions={false}
        value={value}
        onChange={(e) => onTokenChange((e.target as HTMLSelectElement).value)}
        className={styles.tokenSelect}
      />
    </div>
  )
}
