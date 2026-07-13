import { federatedProviders } from 'app.config.cjs'

export type FederatedProviderType = 'main' | 'partner'

export interface FederatedProvider {
  type: FederatedProviderType
  logout?: string
}

type ProviderMap = Record<string, FederatedProvider>

function normalize(value?: string): string {
  return value?.trim().toLowerCase() || ''
}

function getProviders(): ProviderMap {
  if (
    federatedProviders &&
    typeof federatedProviders === 'object' &&
    !Array.isArray(federatedProviders)
  ) {
    return federatedProviders as ProviderMap
  }
  return {}
}

export function getFederatedProvider(
  loginSource?: string
): FederatedProvider | undefined {
  const normalizedLoginSource = normalize(loginSource)
  if (!normalizedLoginSource) return undefined
  const providers = getProviders()
  for (const [providerName, provider] of Object.entries(providers)) {
    if (normalize(providerName) === normalizedLoginSource) {
      return provider
    }
  }
  return undefined
}

export function isPartnerProvider(loginSource?: string): boolean {
  return getFederatedProvider(loginSource)?.type === 'partner'
}

export function isMainProvider(loginSource?: string): boolean {
  return getFederatedProvider(loginSource)?.type === 'main'
}
