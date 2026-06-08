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
  serviceId?: string,
  datatokenAddress?: string
): ServiceStatsEntry | undefined {
  const stats = (asset.indexedMetadata?.stats || []) as ServiceStatsEntry[]
  const matched = stats.find(
    (stat) =>
      (serviceId != null && stat?.serviceId === serviceId) ||
      (datatokenAddress &&
        stat?.datatokenAddress?.toLowerCase() ===
          datatokenAddress.toLowerCase())
  )

  return matched || stats[serviceIndex]
}

export function getAssetPriceTokenAddresses(
  asset: AssetWithPriceSources
): string[] {
  const addresses = new Set<string>()

  asset.credentialSubject?.services?.forEach((service, index) => {
    const stat = getServiceStats(
      asset,
      index,
      service.id,
      service.datatokenAddress
    )
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
  tokenSymbolMap?: TokenSymbolMap,
  datatokenAddress?: string
): string | undefined {
  const stat = getServiceStats(asset, serviceIndex, serviceId, datatokenAddress)

  const priceEntry = stat?.prices?.[0]
  if (priceEntry?.baseToken?.symbol) return priceEntry.baseToken.symbol
  if (priceEntry?.baseToken?.address) {
    const mappedSymbol =
      tokenSymbolMap?.[priceEntry.baseToken.address.toLowerCase()]
    if (mappedSymbol) return mappedSymbol
  }

  const priceToken = priceEntry?.token
  if (typeof priceToken === 'string') {
    const mappedSymbol = tokenSymbolMap?.[priceToken.toLowerCase()]
    if (mappedSymbol) return mappedSymbol
  }

  if (typeof priceToken === 'object') {
    if (priceToken.symbol) return priceToken.symbol
    if (priceToken.address) {
      const mappedSymbol = tokenSymbolMap?.[priceToken.address.toLowerCase()]
      if (mappedSymbol) return mappedSymbol
    }
  }

  if (priceEntry?.tokenSymbol) return priceEntry.tokenSymbol
  if (stat?.price?.tokenSymbol) return stat.price.tokenSymbol

  return undefined
}
