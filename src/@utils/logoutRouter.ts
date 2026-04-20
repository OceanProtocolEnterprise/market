export const getAuthMeta = () => {
  try {
    return JSON.parse(localStorage.getItem('auth_meta') || '{}')
  } catch {
    return {}
  }
}

export const isVM3User = () => {
  const meta = getAuthMeta()
  const issuer = (meta?.issuer || '').toLowerCase()
  const upstream = (meta?.upstream_idp || '').toLowerCase()
  const mainOidc = (meta?.main_oidc || '').toLowerCase()

  return (
    issuer.includes('vm3') ||
    upstream.includes('vm3') ||
    upstream.includes('partner') ||
    mainOidc.includes('vm3')
  )
}

export const getLogoutRedirect = () => {
  return `${window.location.origin}/auth/callback/logout`
}

export const getVM3LogoutUrl = () => {
  return 'https://ocean-node-vm3.oceanenterprise.io:8443/application/o/vm2-federation/end-session/'
}

export const clearVM3Storage = () => {
  localStorage.removeItem('auth_meta')
  localStorage.removeItem('oidc_auth_meta')
  sessionStorage.removeItem('vm3_oidc_session')
  sessionStorage.removeItem('vm3_oidc_tokens')
  sessionStorage.removeItem('vm3_logout_timeout')
}

export const saveVM3SessionData = () => {
  const oidcSession = localStorage.getItem('oidc_session')
  const oidcTokens = localStorage.getItem('oidc_tokens')

  if (oidcSession) sessionStorage.setItem('vm3_oidc_session', oidcSession)
  if (oidcTokens) sessionStorage.setItem('vm3_oidc_tokens', oidcTokens)
}

export const restoreVM3SessionData = () => {
  const savedSession = sessionStorage.getItem('vm3_oidc_session')
  const savedTokens = sessionStorage.getItem('vm3_oidc_tokens')

  if (savedSession) localStorage.setItem('oidc_session', savedSession)
  if (savedTokens) localStorage.setItem('oidc_tokens', savedTokens)
}
