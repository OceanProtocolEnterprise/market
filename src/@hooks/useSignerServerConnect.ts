import { useCallback, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { useAccount, useConfig, useConnect } from 'wagmi'
import { useMarketMetadata } from '@context/MarketMetadata'
import { pickPreferredChainId } from '@utils/wallet/chains'
import {
  SIGNER_SERVER_CONNECTOR_ID,
  isSignerServerConfigured,
  signerServerConnector
} from '@utils/wallet/signerServerConnector'

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
  const [isConnecting, setIsConnecting] = useState(false)

  const isConfigured = isSignerServerConfigured()
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

  const connect = useCallback(
    async (chainId?: number) => {
      if (!isConfigured) return

      setIsConnecting(true)
      try {
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
      isConfigured,
      signerServerWagmiConnector
    ]
  )

  const openConnect = useCallback(() => {
    connect(defaultChainId).catch((error) =>
      console.error('Signer server wallet setup failed:', error)
    )
  }, [connect, defaultChainId])

  return {
    connect,
    openConnect,
    isConfigured,
    isConnecting
  }
}
