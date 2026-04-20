import type { BrandPanelIconVariant } from './AuthLayout/BrandPanelArtwork'

export type AuthTab = 'login' | 'signup'

export interface AuthFeature {
  icon: BrandPanelIconVariant
  text: string
}

export interface AuthPanelContent {
  title: string
  description: string
  features?: AuthFeature[]
}

export const OIDC_LOGOUT_PENDING_KEY = 'oidc_logout_pending'
export const OIDC_LOGOUT_STATE_KEY = 'oidc_logout_state'
export const OIDC_LOGOUT_STARTED_AT_KEY = 'oidc_logout_started_at'
export const OIDC_LOGOUT_RETURN_FALLBACK_MS = 1500

export const authTabLabels: Record<AuthTab, string> = {
  login: 'Sign in',
  signup: 'Create account'
}

export const authBrandDefaults: {
  title: string
  description: string
  features: AuthFeature[]
  trustLabel: string
  trustBadges: string[]
} = {
  title: 'Ocean Enterprise Marketplace',
  description:
    'Discover, publish and manage data, software and AI services with enterprise-grade governance and trusted access control.',
  features: [
    { icon: 'marketplace', text: 'Publish and discover service offerings' },
    { icon: 'access', text: 'Control access with verified credentials' },
    { icon: 'interop', text: 'Standardized, interoperable metadata' },
    { icon: 'compute', text: 'Private computation with Compute-to-Data' }
  ],
  trustLabel: 'Built for trusted data exchange',
  trustBadges: ['SSI Verification', 'Gaia-X Aligned', 'Compute-to-Data']
}

export const authLoginCopy = {
  title: 'Welcome back',
  subtitle: "Sign in to your organization's data marketplace",
  ssoLabel: 'Log in to OE Marketplace',
  ssoLoadingLabel: 'Redirecting to login...',
  demoNotice: 'Demo Mode: No real authentication required'
}

export const authSignupCopy = {
  title: 'Get started',
  subtitle: "Create your organization's marketplace account",
  ssoLabel: 'Sign-up to OE Marketplace',
  ssoLoadingLabel: 'Redirecting to signup...',
  termsIntro: 'By creating an account, you agree to our',
  termsLabel: 'Terms of Service',
  privacyLabel: 'Privacy Policy'
}

export const authSetupCopy = {
  title: 'One more step to enter the marketplace',
  subtitle: 'Connect your wallet and SSI to finish secure access setup.',
  walletOnlySubtitle: 'Connect your wallet to finish secure access setup.',
  greeting: 'Welcome back',
  signupGreeting: 'Welcome',
  signupSubtitle:
    'Connect your wallet and SSI to finish setting up secure access.',
  signupWalletOnlySubtitle:
    'Connect your wallet to finish setting up secure access.',
  ssoStep: 'Company SSO',
  ssoMeta: 'Company sign-in complete',
  walletStep: 'Connect your Web3 wallet',
  walletPending: 'Connect your Web3 wallet to continue',
  walletActive: 'Connect your Web3 wallet to continue',
  walletComplete: 'Wallet connected',
  ssiStep: 'Establish SSI session',
  ssiPending: 'Connect your wallet first to unlock SSI setup',
  ssiNetwork: 'Switch to an SSI-supported network to continue',
  ssiActive: 'Connect your SSI wallet to finish secure access',
  ssiConnecting: 'Confirm the SSI request in your wallet',
  ssiComplete: 'SSI session established',
  connectWallet: 'Connect wallet',
  connectSsi: 'Connect SSI wallet',
  connectingSsi: 'Connecting SSI...',
  switchNetwork: 'Switch network',
  redirecting: 'Access ready. Redirecting you now...',
  wrongAccount: 'Signed in with a different company account?',
  wrongAccountAction: 'Use another account'
}

export const authLogoutCopy = {
  title: 'Logging you out',
  subtitle: 'Redirecting to Authentik to confirm sign out',
  waiting: 'Please wait a moment'
}
