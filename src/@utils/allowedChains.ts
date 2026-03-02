import { getRuntimeConfig } from './runtimeConfig'

export function parseAllowedChainIdsFromNodeUriMap(
  rawNodeUriMap?: string
): number[] {
  if (!rawNodeUriMap) return []

  try {
    const rpcMap = JSON.parse(rawNodeUriMap) as Record<string, string>

    return Object.keys(rpcMap)
      .map((chainId) => Number(chainId))
      .filter((chainId) => Number.isFinite(chainId))
  } catch {
    return []
  }
}

export function getAllowedChainIdsFromNodeUriMap(): number[] {
  const runtimeConfig = getRuntimeConfig()
  return parseAllowedChainIdsFromNodeUriMap(
    runtimeConfig.NEXT_PUBLIC_NODE_URI_MAP
  )
}
