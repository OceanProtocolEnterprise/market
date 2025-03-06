import {
  createContext,
  ReactElement,
  ReactNode,
  useContext,
  useEffect,
  useState
} from 'react'
import {
  SsiKeyDesc,
  SsiWalletCache,
  SsiWalletDesc,
  SsiWalletSession
} from 'src/@types/SsiWallet'

export interface SsiWalletContext {
  sessionToken: SsiWalletSession
  setSessionToken: (token: SsiWalletSession) => void
  selectedWallet: SsiWalletDesc
  setSelectedWallet: (wallet: SsiWalletDesc) => void
  selectedKey: SsiKeyDesc
  setSelectedKey: (key: SsiKeyDesc) => void
  verifierSessionId: string
  setVerifierSessionId: (id: string) => void
  ssiWalletCache: SsiWalletCache
  setSsiWalletCache: (cache: SsiWalletCache) => void
}

const SsiWalletContext = createContext(null)

export function SsiWalletProvider({
  children
}: {
  children: ReactNode
}): ReactElement {
  const [sessionToken, setSessionToken] = useState<SsiWalletSession>()
  const [selectedWallet, setSelectedWallet] = useState<SsiWalletDesc>()
  const [selectedKey, setSelectedKey] = useState<SsiKeyDesc>()
  const [verifierSessionId, setVerifierSessionId] = useState<string>()
  const [ssiWalletCache, setSsiWalletCache] = useState<SsiWalletCache>(
    new SsiWalletCache()
  )

  useEffect(() => {
    if (!sessionToken) {
      setSelectedWallet(undefined)
      setSelectedKey(undefined)
      setVerifierSessionId(undefined)
    }
  }, [sessionToken])

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
          verifierSessionId,
          setVerifierSessionId,
          ssiWalletCache,
          setSsiWalletCache
        } as SsiWalletContext
      }
    >
      {children}
    </SsiWalletContext.Provider>
  )
}

export const useSsiWallet = (): SsiWalletContext => useContext(SsiWalletContext)
