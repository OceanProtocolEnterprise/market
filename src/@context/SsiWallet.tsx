import {
  createContext,
  ReactElement,
  ReactNode,
  useContext,
  useState
} from 'react'

interface SsiWalletValue {
  accessToken: string
  setAccessToken: (token: string) => void
}

const SsiWalletContext = createContext(null)

export function SsiWalletProvider({
  children
}: {
  children: ReactNode
}): ReactElement {
  const [accessToken, setAccessToken] = useState<string>()

  return (
    <SsiWalletContext.Provider
      value={
        {
          accessToken,
          setAccessToken
        } as SsiWalletValue
      }
    >
      {children}
    </SsiWalletContext.Provider>
  )
}

export const useSsiWallet = (): SsiWalletValue => useContext(SsiWalletContext)
