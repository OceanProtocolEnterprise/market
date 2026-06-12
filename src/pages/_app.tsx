'use client'
import type { AppProps } from 'next/app'
import Script from 'next/script'
import { ReactElement, useEffect, useState } from 'react'
import { UserPreferencesProvider } from '@context/UserPreferences'
import UrqlProvider from '@context/UrqlProvider'
import ConsentProvider from '@context/CookieConsent'
import { SearchBarStatusProvider } from '@context/SearchBarStatus'
import App from '../components/App'
import '@oceanprotocol/typographies/css/ocean-typo.css'
import '../stylesGlobal/styles.css'
import Decimal from 'decimal.js'
import MarketMetadataProvider from '@context/MarketMetadata'
import { WagmiProvider } from 'wagmi'
import { ConnectKitProvider } from 'connectkit'
import { connectKitTheme, createWagmiConfig } from '@utils/wallet'
import { FilterProvider } from '@context/Filter'
import { SsiWalletProvider } from '@context/SsiWallet'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@utils/authProvider'
import AuthGuard from '@components/Auth/AuthGuard/AuthGuard'
import { initAnalytics } from '@utils/analytics'

const queryClient = new QueryClient()
function MyApp({ Component, pageProps }: AppProps): ReactElement {
  const [mounted, setMounted] = useState(false)
  const [wagmiConfig] = useState(() => createWagmiConfig())

  useEffect(() => {
    setMounted(true)
    initAnalytics()
  }, [])

  if (!mounted) return null

  Decimal.set({ rounding: 1 })

  return (
    <QueryClientProvider client={queryClient}>
      <Script src="/runtime-config.js" strategy="beforeInteractive" />
      <WagmiProvider config={wagmiConfig}>
        <ConnectKitProvider
          options={{ initialChainId: 0 }}
          customTheme={connectKitTheme}
        >
          <MarketMetadataProvider>
            <UrqlProvider>
              <UserPreferencesProvider>
                <ConsentProvider>
                  <SearchBarStatusProvider>
                    <FilterProvider>
                      <SsiWalletProvider>
                        <AuthProvider>
                          <App>
                            <AuthGuard>
                              <Component {...pageProps} />
                            </AuthGuard>
                          </App>
                        </AuthProvider>
                      </SsiWalletProvider>
                    </FilterProvider>
                  </SearchBarStatusProvider>
                </ConsentProvider>
              </UserPreferencesProvider>
            </UrqlProvider>
          </MarketMetadataProvider>
        </ConnectKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  )
}

export default MyApp
