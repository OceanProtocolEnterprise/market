import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { useAccount, useConfig, useConnect } from 'wagmi'
import { useMarketMetadata } from '@context/MarketMetadata'
import { pickPreferredChainId } from '@utils/wallet/chains'
import {
  SIGNER_SERVER_CONNECTOR_ID,
  signerServerConnector
} from '@utils/wallet/signerServerConnector'
import { checkSignerServerHealth } from '@utils/wallet/signerServerApi'
import { useAuth } from './useAuth'

function isConnectorAlreadyConnectedError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes('connector already connected')
  )
}

export function useSignerServerConnect() {
  const { connectAsync } = useConnect()
  const account = useAccount()
  const wagmiConfig = useConfig()
  const { validatedSupportedChains } = useMarketMetadata()
  const { isAuthenticated, isSessionVerified } = useAuth()
  const [isConfigured, setIsConfigured] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  const signerServerWagmiConnector = useMemo(
    () =>
      wagmiConfig.connectors.find(
        (connector) => connector.id === SIGNER_SERVER_CONNECTOR_ID
      ) || signerServerConnector(),
    [wagmiConfig.connectors]
  )

  const defaultChainId = useMemo(() => {
    const chains = validatedSupportedChains?.length
      ? wagmiConfig.chains.filter((chain) =>
          validatedSupportedChains.includes(chain.id)
        )
      : wagmiConfig.chains

    return pickPreferredChainId(chains.map((chain) => chain.id))
  }, [validatedSupportedChains, wagmiConfig.chains])

  useEffect(() => {
    if (!isSessionVerified || !isAuthenticated) {
      setIsConfigured(false)
      return
    }

    let cancelled = false

    checkSignerServerHealth().then((isHealthy) => {
      if (!cancelled) setIsConfigured(isHealthy)
    })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, isSessionVerified])

  const connect = useCallback(
    async (chainId?: number) => {
      setIsConnecting(true)
      try {
        const isHealthy = await checkSignerServerHealth()
        setIsConfigured(isHealthy)
        if (!isHealthy) {
          throw new Error('Signer server is not available for this session.')
        }

        if (
          account.isConnected &&
          account.connector?.id === SIGNER_SERVER_CONNECTOR_ID
        ) {
          return
        }

        await connectAsync({
          connector: signerServerWagmiConnector,
          chainId: chainId || defaultChainId
        })
      } catch (error) {
        if (isConnectorAlreadyConnectedError(error)) return

        toast.error(
          error instanceof Error ? error.message : 'Signer server failed.'
        )
      } finally {
        setIsConnecting(false)
      }
    },
    [
      account.connector?.id,
      account.isConnected,
      connectAsync,
      defaultChainId,
      signerServerWagmiConnector
    ]
  )

  const openConnect = useCallback(() => {
    connect(defaultChainId).catch(() => undefined)
  }, [connect, defaultChainId])

  return {
    connect,
    openConnect,
    isConfigured,
    isConnecting
  }
}
