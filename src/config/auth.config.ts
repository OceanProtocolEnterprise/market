import { getRuntimeConfig } from '@utils/runtimeConfig'

// Helper to get env from runtime config or process.env
const getEnv = (key: string): string | undefined => {
  const hasWindow = typeof window !== 'undefined'
  if (hasWindow && window.__RUNTIME_CONFIG__) {
    const value = window.__RUNTIME_CONFIG__[key]
    if (typeof value !== 'undefined') return value
  }
  return process.env[key]
}

export const authConfig = {
  enabled: getEnv('NEXT_PUBLIC_AUTH_ENABLED') === 'true',
  provider: getEnv('NEXT_PUBLIC_AUTH_PROVIDER') || 'mock',
  oidc: {
    issuer: getEnv('NEXT_PUBLIC_OIDC_ISSUER') || '',
    clientId: getEnv('NEXT_PUBLIC_OIDC_CLIENT_ID') || '',
    clientSecret: getEnv('NEXT_PUBLIC_OIDC_CLIENT_SECRET') || '',
    redirectUri:
      getEnv('NEXT_PUBLIC_OIDC_REDIRECT_URI') ||
      'http://localhost:8008/auth/callback',
    scope: 'openid profile email federated_identity',
    responseType: 'code',
    pkceMethod: 'S256'
  }
}
