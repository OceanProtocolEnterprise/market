import {
  useCallback,
  createContext,
  ReactElement,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'
import { useAccount } from 'wagmi'
import appConfig from 'app.config.cjs'
import { useEthersSigner } from '@hooks/useEthersSigner'
import { disconnectFromWallet } from '@utils/wallet/ssiWallet'
import useSsiAllowedChain from '@hooks/useSsiAllowedChain'
import { LoggerInstance } from '@oceanprotocol/lib'
import { useUserPreferences } from './UserPreferences'
import {
  SsiKeyDesc,
  SsiVerifiableCredential,
  SsiWalletCache,
  SsiWalletDesc,
  SsiWalletSession
} from 'src/@types/SsiWallet'

export interface SsiWalletContext {
  sessionToken?: SsiWalletSession
  setSessionToken: (token?: SsiWalletSession) => void
  selectedWallet?: SsiWalletDesc
  setSelectedWallet: (wallet?: SsiWalletDesc) => void
  selectedKey?: SsiKeyDesc
  setSelectedKey: (key?: SsiKeyDesc) => void
  lookupVerifierSessionId: (did: string, serviceId: string) => string
  lookupVerifierSessionIdSkip: (did: string, serviceId: string) => string
  cacheVerifierSessionId: (
    did: string,
    serviceId: string,
    sessionId: string,
    skipCheck?: boolean
  ) => void
  clearVerifierSessionCache: () => void
  verifierSessionCache: Record<string, string>
  ssiWalletCache: SsiWalletCache
  setSsiWalletCache: (cache: SsiWalletCache) => void
  cachedCredentials: SsiVerifiableCredential[]
  setCachedCredentials: (credentials: SsiVerifiableCredential[]) => void
  selectedDid?: string
  setSelectedDid: (did?: string) => void
  tryAcquireSsiAutoConnectLock: () => boolean
  resetSsiAutoConnectLock: () => void
  isSsiSessionHydrating: boolean
  setIsSsiSessionHydrating: (value: boolean) => void
  isSsiStateHydrated: boolean
}

const SessionTokenStorage = 'sessionToken'
const VerifierSessionIdStorage = 'verifierSessionId'

const SsiWalletContext = createContext(null)

export function SsiWalletProvider({
  children
}: {
  children: ReactNode
}): ReactElement {
  const { address, isConnected } = useAccount()
  const { setShowSsiWalletModule } = useUserPreferences()
  const { chainId, isSsiChainAllowed, isSsiChainReady } = useSsiAllowedChain()
  const walletClient = useEthersSigner()
  const [sessionToken, setSessionToken] = useState<SsiWalletSession>()
  const [selectedWallet, setSelectedWallet] = useState<SsiWalletDesc>()
  const [selectedKey, setSelectedKey] = useState<SsiKeyDesc>()
  const [ssiWalletCache, setSsiWalletCache] = useState<SsiWalletCache>(
    new SsiWalletCache()
  )
  const [cachedCredentials, setCachedCredentialsState] = useState<
    SsiVerifiableCredential[]
  >([])
  const setCachedCredentials = useCallback(
    (credentials: SsiVerifiableCredential[]) => {
      setCachedCredentialsState(Array.isArray(credentials) ? credentials : [])
    },
    []
  )

  const [verifierSessionCache, setVerifierSessionCache] = useState<
    Record<string, string>
  >({})

  const [selectedDid, setSelectedDid] = useState<string>()
  const [isSsiSessionHydrating, setIsSsiSessionHydrating] =
    useState<boolean>(false)
  const [isSsiStateHydrated, setIsSsiStateHydrated] = useState<boolean>(false)
  const ssiAutoConnectLockRef = useRef(false)
  const previousChainIdRef = useRef<number>()
  const previousAddressRef = useRef<string>()
  const ssiReconnectInProgressRef = useRef(false)

  function tryAcquireSsiAutoConnectLock(): boolean {
    if (ssiAutoConnectLockRef.current) return false
    ssiAutoConnectLockRef.current = true
    return true
  }

  function resetSsiAutoConnectLock() {
    ssiAutoConnectLockRef.current = false
  }

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(SessionTokenStorage)
      if (!storedToken || storedToken === 'undefined') {
        setSessionToken(undefined)
      } else {
        setSessionToken(JSON.parse(storedToken))
      }
    } catch (error) {
      setSessionToken(undefined)
    }

    try {
      const storageString = localStorage.getItem(VerifierSessionIdStorage)
      let sessions = JSON.parse(storageString) as Record<string, string>
      if (!sessions) {
        sessions = {}
      }
      setVerifierSessionCache(sessions)
    } catch (error) {
      setVerifierSessionCache({})
    } finally {
      setIsSsiStateHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!sessionToken) {
      setSelectedWallet(undefined)
      setSelectedKey(undefined)
      setSelectedDid(undefined)
      setIsSsiSessionHydrating(false)
      resetSsiAutoConnectLock()
      localStorage.removeItem(SessionTokenStorage)
      return
    }
    localStorage.setItem(SessionTokenStorage, JSON.stringify(sessionToken))
  }, [sessionToken])

  const clearSsiSessionState = useCallback(() => {
    ssiWalletCache.clearCredentials()
    setCachedCredentials([])
    localStorage.removeItem(VerifierSessionIdStorage)
    setVerifierSessionCache({})
    setSessionToken(undefined)
  }, [ssiWalletCache, setCachedCredentials])

  useEffect(() => {
    if (!appConfig.ssiEnabled) return
    if (!isSsiChainReady) return

    const previousChainId = previousChainIdRef.current
    const previousAddress = previousAddressRef.current

    previousChainIdRef.current = chainId
    previousAddressRef.current = address

    if (!sessionToken) return

    const chainChanged =
      previousChainId !== undefined && previousChainId !== chainId
    const accountChanged =
      previousAddress &&
      address &&
      previousAddress.toLowerCase() !== address.toLowerCase()
    const shouldDisconnect =
      !isConnected || !isSsiChainAllowed || chainChanged || accountChanged

    if (!shouldDisconnect) return
    if (ssiReconnectInProgressRef.current) return

    ssiReconnectInProgressRef.current = true

    async function reconnectAfterDisconnect() {
      try {
        await disconnectFromWallet()
      } catch (error) {
        LoggerInstance.error(error)
      }

      clearSsiSessionState()

      if (!walletClient || !isConnected || !isSsiChainAllowed) return

      setShowSsiWalletModule(true)
    }

    reconnectAfterDisconnect().finally(() => {
      ssiReconnectInProgressRef.current = false
    })
  }, [
    address,
    chainId,
    isConnected,
    isSsiChainAllowed,
    isSsiChainReady,
    sessionToken,
    walletClient,
    ssiWalletCache,
    clearSsiSessionState,
    setShowSsiWalletModule
  ])

  function lookupVerifierSessionId(did: string, serviceId: string): string {
    return verifierSessionCache?.[`${did}_${serviceId}`]
  }

  function lookupVerifierSessionIdSkip(did: string, serviceId: string): string {
    return verifierSessionCache?.[`${did}_${serviceId}_skip`]
  }

  function cacheVerifierSessionId(
    did: string,
    serviceId: string,
    sessionId: string,
    skipCheck?: boolean
  ) {
    let storageString = localStorage.getItem(VerifierSessionIdStorage)
    let sessions
    try {
      sessions = storageString ? JSON.parse(storageString) : {}
    } catch {
      sessions = {}
    }
    const key = skipCheck ? `${did}_${serviceId}_skip` : `${did}_${serviceId}`
    sessions[key] = sessionId
    storageString = JSON.stringify(sessions)
    localStorage.setItem(VerifierSessionIdStorage, storageString)
    setVerifierSessionCache(sessions)
  }

  function clearVerifierSessionCache() {
    localStorage.removeItem(VerifierSessionIdStorage)
    setVerifierSessionCache({})
  }

  return (
    <SsiWalletContext.Provider
      value={
        {
          sessionToken,
          setSessionToken,
          selectedWallet,
          setSelectedWallet,
          selectedKey,
          setSelectedKey,
          lookupVerifierSessionId,
          lookupVerifierSessionIdSkip,
          cacheVerifierSessionId,
          clearVerifierSessionCache,
          verifierSessionCache,
          ssiWalletCache,
          setSsiWalletCache,
          cachedCredentials,
          setCachedCredentials,
          selectedDid,
          setSelectedDid,
          tryAcquireSsiAutoConnectLock,
          resetSsiAutoConnectLock,
          isSsiSessionHydrating,
          setIsSsiSessionHydrating,
          isSsiStateHydrated
        } as SsiWalletContext
      }
    >
      {children}
    </SsiWalletContext.Provider>
  )
}

export const useSsiWallet = (): SsiWalletContext => useContext(SsiWalletContext)
