import { SsiVerifiableCredential } from 'src/@types/SsiWallet'

export function resetCredentialCache(
  ssiWalletCache: { clearCredentials: () => void },
  setCachedCredentials: (value: SsiVerifiableCredential[]) => void,
  clearVerifierSessionCache: () => void
) {
  ssiWalletCache.clearCredentials()
  setCachedCredentials([])
  clearVerifierSessionCache()
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key && key.startsWith('credential_')) {
        localStorage.removeItem(key)
      }
    }
  } catch {
    // no-op
  }
}
