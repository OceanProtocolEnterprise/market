import { useEffect, useState } from 'react'
import { useChainId } from 'wagmi'

type Eip1193Provider = {
  chainId?: string | number
  on?: (event: string, callback: (value?: unknown) => void) => void
  removeListener?: (event: string, callback: (value?: unknown) => void) => void
}

function parseChainId(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = value.startsWith('0x')
      ? Number.parseInt(value, 16)
      : Number.parseInt(value, 10)

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return undefined
}

export default function useActiveWalletChainId(): number | undefined {
  const wagmiChainId = useChainId()
  const [injectedChainId, setInjectedChainId] = useState<number>()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const ethereum = (window as Window & { ethereum?: unknown }).ethereum as
      | Eip1193Provider
      | undefined

    if (!ethereum) return

    const updateChainId = (value?: unknown) => {
      const parsedChainId = parseChainId(value ?? ethereum.chainId)
      if (parsedChainId === undefined) return
      setInjectedChainId((previous) =>
        previous === parsedChainId ? previous : parsedChainId
      )
    }

    updateChainId()

    const handleChainChanged = (value?: unknown) => {
      updateChainId(value)
    }

    ethereum.on?.('chainChanged', handleChainChanged)

    return () => {
      ethereum.removeListener?.('chainChanged', handleChainChanged)
    }
  }, [])

  return injectedChainId ?? wagmiChainId
}
