import { useState } from 'react'
import { useSsiWallet } from '@context/SsiWallet'
import { useUserPreferences } from '@context/UserPreferences'
import {
  connectToWallet,
  getWalletKeys,
  getWallets,
  setSsiWalletApiOverride,
  STORAGE_KEY
} from '@utils/wallet/ssiWallet'
import appConfig from 'app.config.cjs'
import { LoggerInstance } from '@oceanprotocol/lib'
import SsiApiModal from '../Wallet/SsiApiModal'
import { SsiWalletDesc, SsiWalletSession } from 'src/@types/SsiWallet'
import { useEthersSigner } from '@hooks/useEthersSigner'
import useSsiAutoConnectPrompt from '@hooks/useSsiAutoConnectPrompt'
import { toast } from 'react-toastify'

export default function SsiWalletManager() {
  const { showSsiWalletModule, setShowSsiWalletModule } = useUserPreferences()
  const walletClient = useEthersSigner()
  useSsiAutoConnectPrompt()
  const {
    setSessionToken,
    ssiWalletCache,
    setCachedCredentials,
    clearVerifierSessionCache,
    setIsSsiSessionHydrating,
    selectedWallet,
    setSelectedWallet,
    setSelectedKey,
    setSelectedDid
  } = useSsiWallet()

  const [overrideApi, setOverrideApi] = useState(() => {
    return sessionStorage.getItem(STORAGE_KEY) || appConfig.ssiWalletApi
  })

  const fetchWallets = async (session: SsiWalletSession) => {
    try {
      if (!session) return selectedWallet
      const wallets = await getWallets(session.token)
      setSelectedWallet(wallets[0])
      return wallets[0]
    } catch (error) {
      LoggerInstance.error(error)
      return selectedWallet
    }
  }

  const fetchKeys = async (
    wallet: SsiWalletDesc,
    session: SsiWalletSession
  ) => {
    if (!wallet || !session) return
    try {
      const keys = await getWalletKeys(wallet, session.token)
      setSelectedKey(keys[0])
    } catch (error) {
      LoggerInstance.error(error)
    }
  }

  async function handleSsiConnect() {
    setIsSsiSessionHydrating(true)

    try {
      if (!walletClient) {
        LoggerInstance.error('Wallet Client not available for SSI connection.')
        return
      }

      ssiWalletCache.clearCredentials()
      setCachedCredentials([])
      clearVerifierSessionCache()
      setSsiWalletApiOverride(overrideApi)

      const session = await connectToWallet(walletClient)
      setSessionToken(session)
      setSelectedDid(undefined)
      setSelectedKey(undefined)
      const wallet = await fetchWallets(session)
      await fetchKeys(wallet, session)
      setShowSsiWalletModule(false)
    } catch (error) {
      LoggerInstance.error(error)
      const message =
        error instanceof Error ? error.message : 'SSI connection failed'
      toast.error(message)
    } finally {
      setIsSsiSessionHydrating(false)
    }
  }

  return showSsiWalletModule ? (
    <SsiApiModal
      apiValue={overrideApi}
      onChange={setOverrideApi}
      onConnect={handleSsiConnect}
      onClose={() => setShowSsiWalletModule(false)}
    />
  ) : null
}
