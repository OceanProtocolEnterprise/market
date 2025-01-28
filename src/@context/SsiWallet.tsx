import {
  createContext,
  ReactElement,
  ReactNode,
  useContext,
  useState
} from 'react'
import { SsiWalletSession } from 'src/@types/SsiWallet'

interface SsiWalletValue {
  sessionToken: SsiWalletSession
  setSessionToken: (token: SsiWalletSession) => void
  selectedWallet: string
  setSelectedWallet: (id: string) => void
  selectedKey: string
  setSelectedKey: (id: string) => void
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
  const [selectedWallet, setSelectedWallet] = useState<string>()
  const [selectedKey, setSelectedKey] = useState<string>()

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
