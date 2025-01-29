import {
  createContext,
  ReactElement,
  ReactNode,
  useContext,
  useState
} from 'react'
import {
  SsiKeyDesc,
  SsiWalletDesc,
  SsiWalletSession
} from 'src/@types/SsiWallet'

interface SsiWalletValue {
  sessionToken: SsiWalletSession
  setSessionToken: (token: SsiWalletSession) => void
  selectedWallet: SsiWalletDesc
  setSelectedWallet: (wallet: SsiWalletDesc) => void
  selectedKey: SsiKeyDesc
  setSelectedKey: (key: SsiKeyDesc) => void
}

const SsiWalletContext = createContext(null)

export function SsiWalletProvider({
  children
}: {
  children: ReactNode
}): ReactElement {
  const [sessionToken, setSessionToken] = useState<
    SsiWalletSession | undefined
  >()
  const [selectedWallet, setSelectedWallet] = useState<SsiWalletDesc>()
  const [selectedKey, setSelectedKey] = useState<SsiKeyDesc>()

  return (
    <SsiWalletContext.Provider
      value={
        {
          sessionToken,
          setSessionToken,
          selectedWallet,
          setSelectedWallet,
          selectedKey,
          setSelectedKey
        } as SsiWalletValue
      }
    >
      {children}
    </SsiWalletContext.Provider>
  )
}

export const useSsiWallet = (): SsiWalletValue => useContext(SsiWalletContext)
