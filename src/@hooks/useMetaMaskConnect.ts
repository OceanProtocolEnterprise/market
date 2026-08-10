import { useCallback, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { useConfig, useConnect } from 'wagmi'
import { injected } from 'wagmi/connectors'

function isConnectorAlreadyConnectedError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes('connector already connected')
  )
}

function getMetaMaskErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  return 'MetaMask connection failed.'
}

export function useMetaMaskConnect() {
  const { connectAsync } = useConnect()
  const wagmiConfig = useConfig()
  const [isConnecting, setIsConnecting] = useState(false)

  const metaMaskConnector = useMemo(
    () =>
      wagmiConfig.connectors.find(
        (connector) =>
          connector.name.toLowerCase() === 'metamask' ||
          connector.id.toLowerCase().includes('metamask')
      ) || injected({ target: 'metaMask' }),
    [wagmiConfig.connectors]
  )

  const connect = useCallback(async () => {
    setIsConnecting(true)
    try {
      await connectAsync({ connector: metaMaskConnector })
    } catch (error) {
      if (!isConnectorAlreadyConnectedError(error)) {
        toast.error(getMetaMaskErrorMessage(error))
      }
    } finally {
      setIsConnecting(false)
    }
  }, [connectAsync, metaMaskConnector])

  const openConnect = useCallback(() => {
    connect().catch(() => undefined)
  }, [connect])

  return {
    connect,
    openConnect,
    isConnecting
  }
}
