import { useEffect, useMemo, useState } from 'react'
import { useAccount, useChainId } from 'wagmi'

type Eip1193Provider = {
  chainId?: string | number
  request?: (args: { method: string }) => Promise<unknown>
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
  const { connector } = useAccount()
  const wagmiChainId = useChainId()
  const [injectedChainId, setInjectedChainId] = useState<number>()
  const shouldPreferInjectedChain = useMemo(() => {
    if (!connector) return false

    const connectorId = connector.id?.toLowerCase()
    const connectorType = (connector as { type?: string }).type?.toLowerCase()

    return connectorId === 'injected' || connectorType === 'injected'
  }, [connector])

  useEffect(() => {
    if (!shouldPreferInjectedChain) {
      setInjectedChainId(undefined)
      return
    }

    let cancelled = false
    let activeProvider: Eip1193Provider | undefined
    let activeListener: ((value?: unknown) => void) | undefined

    const setChainId = (value?: unknown) => {
      const parsedChainId = parseChainId(value)
      if (parsedChainId === undefined || cancelled) return

      setInjectedChainId((previous) =>
        previous === parsedChainId ? previous : parsedChainId
      )
    }

    const resolveFallbackProvider = (): Eip1193Provider | undefined => {
      if (typeof window === 'undefined') return

      return (window as Window & { ethereum?: unknown }).ethereum as
        | Eip1193Provider
        | undefined
    }

    const initializeProvider = async () => {
      try {
        const connectorProvider = connector?.getProvider
          ? ((await connector.getProvider()) as Eip1193Provider | undefined)
          : undefined

        const provider = connectorProvider ?? resolveFallbackProvider()

        if (!provider || cancelled) return

        activeProvider = provider

        const requestedChainId =
          provider.request &&
          (await provider.request({ method: 'eth_chainId' }).catch(() => null))

        setChainId(requestedChainId ?? provider.chainId)

        activeListener = (value?: unknown) => {
          setChainId(value ?? activeProvider?.chainId)
        }

        provider.on?.('chainChanged', activeListener)
      } catch {
        const fallbackProvider = resolveFallbackProvider()
        if (!fallbackProvider || cancelled) return

        activeProvider = fallbackProvider
        setChainId(fallbackProvider.chainId)

        activeListener = (value?: unknown) => {
          setChainId(value ?? activeProvider?.chainId)
        }

        fallbackProvider.on?.('chainChanged', activeListener)
      }
    }

    initializeProvider().catch(() => undefined)

    return () => {
      cancelled = true

      if (activeProvider && activeListener) {
        activeProvider.removeListener?.('chainChanged', activeListener)
      }
    }
  }, [connector, shouldPreferInjectedChain])

  if (!shouldPreferInjectedChain) return wagmiChainId

  return injectedChainId ?? wagmiChainId
}
