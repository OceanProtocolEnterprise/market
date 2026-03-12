export type RuntimeConfig = {
  NEXT_PUBLIC_ENCRYPT_ASSET?: string
  NEXT_PUBLIC_METADATACACHE_URI?: string
  NEXT_PUBLIC_SSI_WALLET_API?: string
  NEXT_PUBLIC_SSI_DEFAULT_POLICIES_URL?: string
  NEXT_PUBLIC_SSI_POLICY_SERVER?: string
  NEXT_PUBLIC_SSI_ENABLED?: string
  NEXT_PUBLIC_PROVIDER_URL?: string
  NEXT_PUBLIC_IPFS_UNPIN_FILES?: string
  NEXT_PUBLIC_NODE_URI?: string
  NEXT_PUBLIC_IPFS_GATEWAY?: string
  NEXT_PUBLIC_IPFS_UPLOAD_URL?: string
  NEXT_PUBLIC_IPFS_DELETE_URL?: string
  NEXT_PUBLIC_OPA_SERVER_URL?: string
  NEXT_PUBLIC_HIDE_ONBOARDING_MODULE_BY_DEFAULT?: string
  NEXT_PUBLIC_NODE_URI_INDEXED?: string
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?: string
  NEXT_PUBLIC_CONSUME_MARKET_FEE?: string
  NEXT_PUBLIC_CONSUME_MARKET_ORDER_FEE_MAP?: string
  NEXT_PUBLIC_FIXED_RATE_EXCHANGE_ADDRESS?: string
  NEXT_PUBLIC_DISPENSER_ADDRESS?: string
  NEXT_PUBLIC_NFT_FACTORY_ADDRESS?: string
  NEXT_PUBLIC_ROUTER_FACTORY_ADDRESS?: string
  NEXT_PUBLIC_ACCESS_LIST_FACTORY_ADDRESS?: string
  NEXT_PUBLIC_NODE_URI_MAP?: string
  NEXT_PUBLIC_CREDENTIAL_VALIDITY_DURATION?: string
  NEXT_PUBLIC_MARKET_FEE_ADDRESS?: string
  NEXT_PUBLIC_MARKET_DEVELOPMENT?: string
  NEXT_PUBLIC_ALLOWED_ERC20_ADDRESSES?: string
  NEXT_PUBLIC_DATASPACE?: string
}

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: RuntimeConfig
  }
}

const runtimeConfig: RuntimeConfig = (() => {
  const baseConfig: RuntimeConfig = {
    NEXT_PUBLIC_ENCRYPT_ASSET: process.env.NEXT_PUBLIC_ENCRYPT_ASSET,
    NEXT_PUBLIC_METADATACACHE_URI: process.env.NEXT_PUBLIC_METADATACACHE_URI,
    NEXT_PUBLIC_SSI_WALLET_API: process.env.NEXT_PUBLIC_SSI_WALLET_API,
    NEXT_PUBLIC_SSI_DEFAULT_POLICIES_URL:
      process.env.NEXT_PUBLIC_SSI_DEFAULT_POLICIES_URL,
    NEXT_PUBLIC_SSI_POLICY_SERVER: process.env.NEXT_PUBLIC_SSI_POLICY_SERVER,
    NEXT_PUBLIC_SSI_ENABLED: process.env.NEXT_PUBLIC_SSI_ENABLED,
    NEXT_PUBLIC_PROVIDER_URL: process.env.NEXT_PUBLIC_PROVIDER_URL,
    NEXT_PUBLIC_IPFS_UNPIN_FILES: process.env.NEXT_PUBLIC_IPFS_UNPIN_FILES,
    NEXT_PUBLIC_NODE_URI: process.env.NEXT_PUBLIC_NODE_URI,
    NEXT_PUBLIC_IPFS_GATEWAY: process.env.NEXT_PUBLIC_IPFS_GATEWAY,
    NEXT_PUBLIC_IPFS_UPLOAD_URL: process.env.NEXT_PUBLIC_IPFS_UPLOAD_URL,
    NEXT_PUBLIC_IPFS_DELETE_URL: process.env.NEXT_PUBLIC_IPFS_DELETE_URL,
    NEXT_PUBLIC_OPA_SERVER_URL: process.env.NEXT_PUBLIC_OPA_SERVER_URL,
    NEXT_PUBLIC_HIDE_ONBOARDING_MODULE_BY_DEFAULT:
      process.env.NEXT_PUBLIC_HIDE_ONBOARDING_MODULE_BY_DEFAULT,
    NEXT_PUBLIC_NODE_URI_INDEXED: process.env.NEXT_PUBLIC_NODE_URI_INDEXED,
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    NEXT_PUBLIC_CONSUME_MARKET_FEE: process.env.NEXT_PUBLIC_CONSUME_MARKET_FEE,
    NEXT_PUBLIC_CONSUME_MARKET_ORDER_FEE_MAP:
      process.env.NEXT_PUBLIC_CONSUME_MARKET_ORDER_FEE_MAP,
    NEXT_PUBLIC_FIXED_RATE_EXCHANGE_ADDRESS:
      process.env.NEXT_PUBLIC_FIXED_RATE_EXCHANGE_ADDRESS,
    NEXT_PUBLIC_DISPENSER_ADDRESS: process.env.NEXT_PUBLIC_DISPENSER_ADDRESS,
    NEXT_PUBLIC_NFT_FACTORY_ADDRESS:
      process.env.NEXT_PUBLIC_NFT_FACTORY_ADDRESS,
    NEXT_PUBLIC_ROUTER_FACTORY_ADDRESS:
      process.env.NEXT_PUBLIC_ROUTER_FACTORY_ADDRESS,
    NEXT_PUBLIC_ACCESS_LIST_FACTORY_ADDRESS:
      process.env.NEXT_PUBLIC_ACCESS_LIST_FACTORY_ADDRESS,
    NEXT_PUBLIC_NODE_URI_MAP: process.env.NEXT_PUBLIC_NODE_URI_MAP,
    NEXT_PUBLIC_CREDENTIAL_VALIDITY_DURATION:
      process.env.NEXT_PUBLIC_CREDENTIAL_VALIDITY_DURATION,
    NEXT_PUBLIC_MARKET_FEE_ADDRESS: process.env.NEXT_PUBLIC_MARKET_FEE_ADDRESS,
    NEXT_PUBLIC_MARKET_DEVELOPMENT: process.env.NEXT_PUBLIC_MARKET_DEVELOPMENT,
    NEXT_PUBLIC_ALLOWED_ERC20_ADDRESSES:
      process.env.NEXT_PUBLIC_ALLOWED_ERC20_ADDRESSES,
    NEXT_PUBLIC_DATASPACE: process.env.NEXT_PUBLIC_DATASPACE
  }

  if (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__) {
    return { ...baseConfig, ...window.__RUNTIME_CONFIG__ }
  }

  return baseConfig
})()

export function getRuntimeConfig(): RuntimeConfig {
  return runtimeConfig
}

function parseRuntimeObject(rawValue?: string): Record<string, unknown> | null {
  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    return null
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null
    }
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

export function getNodeUriMap(
  fallback: Record<string, string> = {}
): Record<string, string> {
  const parsed = parseRuntimeObject(getRuntimeConfig().NEXT_PUBLIC_NODE_URI_MAP)
  if (!parsed) return fallback

  return Object.keys(parsed).reduce((acc: Record<string, string>, key) => {
    const value = parsed[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      acc[key] = value
    }
    return acc
  }, {})
}

export function getAllowedErc20Map(
  fallback: Record<string, string[]> = {}
): Record<string, string[]> {
  const parsed = parseRuntimeObject(
    getRuntimeConfig().NEXT_PUBLIC_ALLOWED_ERC20_ADDRESSES
  )
  if (!parsed) return fallback

  return Object.keys(parsed).reduce((acc: Record<string, string[]>, key) => {
    const value = parsed[key]
    if (!Array.isArray(value)) return acc

    const addresses = value.filter(
      (address): address is string => typeof address === 'string'
    )
    acc[key] = addresses
    return acc
  }, {})
}

export function getAllowedErc20ChainIds(fallback: number[] = []): number[] {
  const parsed = parseRuntimeObject(
    getRuntimeConfig().NEXT_PUBLIC_ALLOWED_ERC20_ADDRESSES
  )
  if (!parsed) {
    return fallback
  }

  const allowedMap = getAllowedErc20Map()
  return Object.keys(allowedMap)
    .filter((chainId) => allowedMap[chainId].length > 0)
    .map(Number)
    .filter((chainId) => Number.isFinite(chainId))
}
