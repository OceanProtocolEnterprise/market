// lib/dfns.ts
export const DFNS_CONFIG = {
  orgId: process.env.DFNS_ORG_ID!,
  clientId: process.env.DFNS_CLIENT_ID!,
  baseUrl: process.env.DFNS_API_URL || 'https://api.dfns.io',
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/dfns/complete-sso`
}
