import { useCallback } from 'react'
import { LoggerInstance } from '@oceanprotocol/lib'
import { toast } from 'react-toastify'
import { useEthersSigner } from '@hooks/useEthersSigner'
import { useSsiWallet } from '@context/SsiWallet'
import { useUserPreferences } from '@context/UserPreferences'
import {
  connectToWallet,
  getWalletKeys,
  getWallets,
  setSsiWalletApiOverride
} from '@utils/wallet/ssiWallet'
import { SsiWalletDesc, SsiWalletSession } from 'src/@types/SsiWallet'

interface ConnectSsiOptions {
  apiOverride?: string
}

export default function useSsiConnect() {
  const walletClient = useEthersSigner()
  const { setShowSsiWalletModule } = useUserPreferences()
  const {
    setSessionToken,
    ssiWalletCache,
    setCachedCredentials,
    clearVerifierSessionCache,
    setIsSsiSessionHydrating,
    setSelectedWallet,
    setSelectedKey,
    setSelectedDid
  } = useSsiWallet()

  const fetchWallets = useCallback(
    async (session: SsiWalletSession): Promise<SsiWalletDesc | undefined> => {
      if (!session?.token) return undefined
      try {
        const wallets = await getWallets(session.token)
        const first = wallets?.[0]
        setSelectedWallet(first)
        return first
      } catch (error) {
        LoggerInstance.error(error)
        setSelectedWallet(undefined)
        return undefined
      }
    },
    [setSelectedWallet]
  )

  const fetchKeys = useCallback(
    async (wallet: SsiWalletDesc, session: SsiWalletSession) => {
      if (!wallet || !session) return
      try {
        const keys = await getWalletKeys(wallet, session.token)
        setSelectedKey(keys[0])
      } catch (error) {
        LoggerInstance.error(error)
      }
    },
    [setSelectedKey]
  )

  const connectSsi = useCallback(
    async ({ apiOverride }: ConnectSsiOptions = {}): Promise<boolean> => {
      setIsSsiSessionHydrating(true)

      try {
        if (!walletClient) {
          toast.error('Connect your wallet before starting SSI setup.')
          return false
        }

        ssiWalletCache.clearCredentials()
        setCachedCredentials([])
        clearVerifierSessionCache()
        setSessionToken(undefined)
        setSelectedWallet(undefined)
        setSelectedKey(undefined)
        setSelectedDid(undefined)

        if (apiOverride) {
          setSsiWalletApiOverride(apiOverride)
        }

        const session = await connectToWallet(walletClient)
        setSessionToken(session)
        const wallet = await fetchWallets(session)
        if (!wallet) {
          toast.error('Connected to SSI wallet API but no wallet was found.')
          setShowSsiWalletModule(false)
          return false
        }
        await fetchKeys(wallet, session)
        setShowSsiWalletModule(false)
        return true
      } catch (error) {
        LoggerInstance.error(error)
        const message =
          error instanceof Error ? error.message : 'SSI connection failed'
        toast.error(message)
        return false
      } finally {
        setIsSsiSessionHydrating(false)
      }
    },
    [
      walletClient,
      ssiWalletCache,
      setCachedCredentials,
      clearVerifierSessionCache,
      setSessionToken,
      setSelectedWallet,
      setSelectedKey,
      setSelectedDid,
      fetchWallets,
      fetchKeys,
      setShowSsiWalletModule,
      setIsSsiSessionHydrating
    ]
  )

  return { connectSsi }
}
