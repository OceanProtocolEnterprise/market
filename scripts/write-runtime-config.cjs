const fs = require('fs')
const path = require('path')

const envPath = path.join(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (typeof process.env[key] === 'undefined') {
      process.env[key] = value
    }
  }
}

const config = {
  NEXT_PUBLIC_ENCRYPT_ASSET: process.env.NEXT_PUBLIC_ENCRYPT_ASSET,
  NEXT_PUBLIC_SSI_WALLET_API: process.env.NEXT_PUBLIC_SSI_WALLET_API,
  NEXT_PUBLIC_SSI_UI_URL: process.env.NEXT_PUBLIC_SSI_UI_URL,
  NEXT_PUBLIC_METADATACACHE_URI: process.env.NEXT_PUBLIC_METADATACACHE_URI,
  NEXT_PUBLIC_PROVIDER_URL: process.env.NEXT_PUBLIC_PROVIDER_URL,
  NEXT_PUBLIC_IPFS_UNPIN_FILES: process.env.NEXT_PUBLIC_IPFS_UNPIN_FILES,
  NEXT_PUBLIC_NODE_URI: process.env.NEXT_PUBLIC_NODE_URI,
  NEXT_PUBLIC_IPFS_GATEWAY: process.env.NEXT_PUBLIC_IPFS_GATEWAY,
  NEXT_PUBLIC_SSI_DEFAULT_POLICIES_URL:
    process.env.NEXT_PUBLIC_SSI_DEFAULT_POLICIES_URL,
  NEXT_PUBLIC_OPA_SERVER_URL: process.env.NEXT_PUBLIC_OPA_SERVER_URL,
  NEXT_PUBLIC_SSI_ENABLED: process.env.NEXT_PUBLIC_SSI_ENABLED,
  NEXT_PUBLIC_HIDE_ONBOARDING_MODULE_BY_DEFAULT:
    process.env.NEXT_PUBLIC_HIDE_ONBOARDING_MODULE_BY_DEFAULT,
  NEXT_PUBLIC_NODE_URI_INDEXED: process.env.NEXT_PUBLIC_NODE_URI_INDEXED,
  NEXT_PUBLIC_CONSUME_MARKET_FEE: process.env.NEXT_PUBLIC_CONSUME_MARKET_FEE,
  NEXT_PUBLIC_CONSUME_MARKET_ORDER_FEE_MAP:
    process.env.NEXT_PUBLIC_CONSUME_MARKET_ORDER_FEE_MAP,
  NEXT_PUBLIC_FIXED_RATE_EXCHANGE_ADDRESS:
    process.env.NEXT_PUBLIC_FIXED_RATE_EXCHANGE_ADDRESS,
  NEXT_PUBLIC_DISPENSER_ADDRESS: process.env.NEXT_PUBLIC_DISPENSER_ADDRESS,
  NEXT_PUBLIC_NFT_FACTORY_ADDRESS: process.env.NEXT_PUBLIC_NFT_FACTORY_ADDRESS,
  NEXT_PUBLIC_ROUTER_FACTORY_ADDRESS:
    process.env.NEXT_PUBLIC_ROUTER_FACTORY_ADDRESS,
  NEXT_PUBLIC_ACCESS_LIST_FACTORY_ADDRESS:
    process.env.NEXT_PUBLIC_ACCESS_LIST_FACTORY_ADDRESS,
  NEXT_PUBLIC_CREDENTIAL_VALIDITY_DURATION:
    process.env.NEXT_PUBLIC_CREDENTIAL_VALIDITY_DURATION,
  NEXT_PUBLIC_NODE_URI_MAP: process.env.NEXT_PUBLIC_NODE_URI_MAP,
  NEXT_PUBLIC_MARKET_FEE_ADDRESS: process.env.NEXT_PUBLIC_MARKET_FEE_ADDRESS,
  NEXT_PUBLIC_ALLOWED_ERC20_ADDRESSES:
    process.env.NEXT_PUBLIC_ALLOWED_ERC20_ADDRESSES,
  NEXT_PUBLIC_DATASPACE: process.env.NEXT_PUBLIC_DATASPACE,
  NEXT_PUBLIC_IMPRINT_URL: process.env.NEXT_PUBLIC_IMPRINT_URL,
  NEXT_PUBLIC_TC_URL: process.env.NEXT_PUBLIC_TC_URL,
  NEXT_PUBLIC_PP_URL: process.env.NEXT_PUBLIC_PP_URL,
  NEXT_PUBLIC_CP_URL: process.env.NEXT_PUBLIC_CP_URL,
  NEXT_PUBLIC_DPUA_URL: process.env.NEXT_PUBLIC_DPUA_URL,
  NEXT_PUBLIC_DFNS_API_URL: process.env.NEXT_PUBLIC_DFNS_API_URL,
  NEXT_PUBLIC_DFNS_RP_ID: process.env.NEXT_PUBLIC_DFNS_RP_ID
}

const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true'
if (authEnabled) {
  console.log('Auth is enabled, exposing OIDC config to runtime')
  config.NEXT_PUBLIC_AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED
  config.NEXT_PUBLIC_AUTH_PROVIDER = process.env.NEXT_PUBLIC_AUTH_PROVIDER
  config.NEXT_PUBLIC_OIDC_TOKEN_URL = process.env.NEXT_PUBLIC_OIDC_TOKEN_URL
  config.NEXT_PUBLIC_OIDC_ISSUER = process.env.NEXT_PUBLIC_OIDC_ISSUER
  config.NEXT_PUBLIC_OIDC_CLIENT_ID = process.env.NEXT_PUBLIC_OIDC_CLIENT_ID
  config.NEXT_PUBLIC_OIDC_REDIRECT_URI =
    process.env.NEXT_PUBLIC_OIDC_REDIRECT_URI
  config.NEXT_PUBLIC_OIDC_SIGNUP_FLOW = process.env.NEXT_PUBLIC_OIDC_SIGNUP_FLOW
  config.NEXT_PUBLIC_MAX_LICENSE_FILE_SIZE_KB =
    process.env.NEXT_PUBLIC_MAX_LICENSE_FILE_SIZE_KB
  config.NEXT_PUBLIC_FEDERATED_OIDC_ISSUERS =
    process.env.NEXT_PUBLIC_FEDERATED_OIDC_ISSUERS
  config.NEXT_PUBLIC_FEDERATED_OIDC_END_SESSION_URL =
    process.env.NEXT_PUBLIC_FEDERATED_OIDC_END_SESSION_URL
}

const outputPath = path.join(process.cwd(), 'public', 'runtime-config.js')
const contents = `window.__RUNTIME_CONFIG__ = ${JSON.stringify(config)};\n`
fs.writeFileSync(outputPath, contents)
