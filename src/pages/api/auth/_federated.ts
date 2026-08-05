import { federatedProviders } from 'app.config.cjs'
import { getEndSessionUrlFromWellKnown } from './_oidc'

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

export async function getProviderEndSessionUrl(
  wellKnownUrl: string,
  loginSource?: string
): Promise<string | undefined> {
  if (!wellKnownUrl) {
    console.warn(
      `No well-known URL provided for ${loginSource || 'unknown provider'}`
    )
    return undefined
  }

  try {
    const endSessionUrl = await getEndSessionUrlFromWellKnown(wellKnownUrl)
    if (!endSessionUrl) {
      console.warn(
        `No end_session_url found for ${
          loginSource || 'unknown provider'
        } at ${wellKnownUrl}`
      )
      return undefined
    }
    return endSessionUrl
  } catch (error) {
    console.error(
      `Failed to get end_session_url for ${loginSource || 'unknown provider'}:`,
      error
    )
    return undefined
  }
}

export function isMainProviderByName(loginSource?: string): boolean {
  if (!loginSource) return false

  const mainProviderName =
    process.env.NEXT_PUBLIC_DATASPACE_AUTHENTIK_NAME || 'main-oidc-app'
  return normalize(loginSource) === normalize(mainProviderName)
}
