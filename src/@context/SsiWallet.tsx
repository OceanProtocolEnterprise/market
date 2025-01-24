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

  return (
    <SsiWalletContext.Provider
      value={
        {
          sessionToken,
          setSessionToken
        } as SsiWalletValue
      }
    >
      {children}
    </SsiWalletContext.Provider>
  )
}

export const useSsiWallet = (): SsiWalletValue => useContext(SsiWalletContext)
