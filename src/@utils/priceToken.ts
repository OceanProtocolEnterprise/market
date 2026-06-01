import { Asset } from 'src/@types/Asset'

type TokenSymbolMap = Record<string, string>
type PriceToken = string | { symbol?: string; address?: string }

export type ServicePriceEntry = {
  price?: string | number
  exchangeId?: string
  tokenSymbol?: string
  token?: PriceToken
  baseToken?: { symbol?: string; address?: string }
}

export type ServiceStatsEntry = {
  serviceId?: string
  datatokenAddress?: string
  price?: { tokenSymbol?: string }
  prices?: ServicePriceEntry[]
}

type AssetWithPriceSources = Asset & {
  accessDetails?: Array<{ baseToken?: { address?: string } }>
  offchain?: {
    stats?: {
      services?: ServiceStatsEntry[]
    }
  }
}

export function getPriceTokenAddress(token?: PriceToken): string {
  if (!token) return ''
  return typeof token === 'string' ? token : token.address || ''
}

export function getServiceStats(
  asset: Asset,
  serviceIndex: number,
  serviceId?: string
): ServiceStatsEntry | undefined {
  const stats = (asset.indexedMetadata?.stats || []) as ServiceStatsEntry[]
  const matched =
    serviceId != null
      ? stats.find((stat) => stat?.serviceId === serviceId)
      : undefined

  return matched || stats[serviceIndex]
}

export function getAssetPriceTokenAddresses(
  asset: AssetWithPriceSources
): string[] {
  const addresses = new Set<string>()

  asset.credentialSubject?.services?.forEach((service, index) => {
    const stat = getServiceStats(asset, index, service.id)
    const priceEntry = stat?.prices?.[0]
    const offchainStat =
      asset.offchain?.stats?.services?.find(
        (entry) => entry?.serviceId === service.id
      ) || asset.offchain?.stats?.services?.[index]
    const offchainPriceEntry = offchainStat?.prices?.[0]

    ;[
      asset.accessDetails?.[index]?.baseToken?.address,
      getPriceTokenAddress(offchainPriceEntry?.token),
      priceEntry?.baseToken?.address,
      getPriceTokenAddress(priceEntry?.token)
    ].forEach((address) => {
      if (address) addresses.add(address.toLowerCase())
    })
  })

  return Array.from(addresses)
}

export function resolveServiceTokenSymbol(
  asset: Asset,
  serviceIndex: number,
  serviceId?: string,
  tokenSymbolMap?: TokenSymbolMap
): string | undefined {
  const stat = getServiceStats(asset, serviceIndex, serviceId)

  if (stat?.price?.tokenSymbol) return stat.price.tokenSymbol

  const priceEntry = stat?.prices?.[0]
  if (priceEntry?.tokenSymbol) return priceEntry.tokenSymbol
  if (priceEntry?.baseToken?.symbol) return priceEntry.baseToken.symbol
  if (priceEntry?.baseToken?.address) {
    return tokenSymbolMap?.[priceEntry.baseToken.address.toLowerCase()]
  }

  const priceToken = priceEntry?.token
  if (!priceToken) return undefined

  if (typeof priceToken === 'string') {
    return tokenSymbolMap?.[priceToken.toLowerCase()]
  }

  if (typeof priceToken === 'object') {
    if (priceToken.symbol) return priceToken.symbol
    if (priceToken.address) {
      return tokenSymbolMap?.[priceToken.address.toLowerCase()]
    }
  }

  return undefined
}
