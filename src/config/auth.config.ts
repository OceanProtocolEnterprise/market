import { getRuntimeConfig } from '@utils/runtimeConfig'
import {
  authEnabled,
  authProvider,
  oidcIssuer,
  oidcClientId,
  oidcRedirectUri,
  oidcSignupFlow
} from 'app.config.cjs'

export interface AuthConfig {
  enabled: boolean
  provider: string
  oidc: {
    issuer: string
    clientId: string
    redirectUri: string
    signupFlow: string
    scope: string
    responseType: string
    pkceMethod: string
  }
}

const isServer = () => typeof window === 'undefined'

export const authConfig = ((): AuthConfig => {
  const runtimeConfig = getRuntimeConfig()

  const enabled = isServer()
    ? authEnabled === 'true'
    : runtimeConfig.NEXT_PUBLIC_AUTH_ENABLED === 'true'

  const provider = isServer()
    ? authProvider || 'mock'
    : runtimeConfig.NEXT_PUBLIC_AUTH_PROVIDER || 'mock'

  const issuer = isServer()
    ? oidcIssuer || ''
    : runtimeConfig.NEXT_PUBLIC_OIDC_ISSUER || ''

  const clientId = isServer()
    ? oidcClientId || ''
    : runtimeConfig.NEXT_PUBLIC_OIDC_CLIENT_ID || ''

  const redirectUri = isServer()
    ? oidcRedirectUri || null
    : runtimeConfig.NEXT_PUBLIC_OIDC_REDIRECT_URI || null

  const signupFlow = isServer()
    ? oidcSignupFlow || 'self-service-registration'
    : runtimeConfig.NEXT_PUBLIC_OIDC_SIGNUP_FLOW || 'self-service-registration'

  return {
    enabled,
    provider,
    oidc: {
      issuer,
      clientId,
      redirectUri,
      signupFlow,
      scope:
        'openid profile email offline_access federated_identity organizationId',
      responseType: 'code',
      pkceMethod: 'S256'
    }
  }
})()
