import { ReactElement, useEffect, useMemo, useState } from 'react'
import { useMarketMetadata } from '@context/MarketMetadata'
import {
  getAssetPriceTokenAddresses,
  getServiceStats,
  resolveServiceTokenSymbol
} from '@utils/priceToken'
import { getOceanConfig } from '@utils/ocean'
import { getTokenInfo } from '@utils/wallet'
import { JsonRpcProvider } from 'ethers'
import { AssetExtended } from 'src/@types/AssetExtended'
import { truncateDid } from '@utils/string'
import styles from './HistoryData.module.css'

interface HistoryServiceStats {
  datatokenAddress?: string
  orders?: number
  prices?: Array<{
    price?: number | string
    baseToken?: { symbol?: string; address?: string }
    tokenSymbol?: string
    token?: string | { symbol?: string; address?: string }
  }>
  serviceId?: string
  symbol?: string
}

function getServiceAccessDetails(
  asset: AssetExtended,
  serviceIndex: number,
  serviceId?: string,
  datatokenAddress?: string
): AccessDetails | undefined {
  return (
    asset.accessDetails?.find(
      (details) =>
        details?.datatoken?.address &&
        datatokenAddress &&
        details.datatoken.address.toLowerCase() ===
          datatokenAddress.toLowerCase()
    ) ||
    asset.accessDetails?.find(
      (details) =>
        details?.addressOrId &&
        serviceId &&
        details.addressOrId.toLowerCase() === serviceId.toLowerCase()
    ) ||
    asset.accessDetails?.[serviceIndex]
  )
}

function getNumericPrice(value?: number | string): number {
  const price = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(price) ? price : 0
}

function getServicePrice(
  asset: AssetExtended,
  serviceIndex: number,
  serviceId?: string,
  serviceStats?: HistoryServiceStats,
  tokenSymbolMap?: Record<string, string>
) {
  const accessDetails = getServiceAccessDetails(
    asset,
    serviceIndex,
    serviceId,
    serviceStats?.datatokenAddress
  )
  const priceEntry = serviceStats?.prices?.[0]
  const value = getNumericPrice(accessDetails?.price ?? priceEntry?.price)
  const tokenSymbol =
    accessDetails?.baseToken?.symbol ||
    priceEntry?.baseToken?.symbol ||
    priceEntry?.tokenSymbol ||
    resolveServiceTokenSymbol(
      asset,
      serviceIndex,
      serviceId,
      tokenSymbolMap,
      serviceStats?.datatokenAddress
    ) ||
    ''

  return { value, tokenSymbol }
}

function formatPrice(value: number, tokenSymbol?: string): string {
  const amount = Number.isFinite(value) ? value : 0
  if (amount === 0) return 'Free'
  return tokenSymbol ? `${amount} ${tokenSymbol}` : `${amount}`
}

function formatRevenue(value: number, tokenSymbol?: string): string {
  const amount = Number.isFinite(value) ? value : 0
  if (amount === 0) return '0'
  return tokenSymbol ? `${amount} ${tokenSymbol}` : `${amount}`
}

export default function ExpandedServices({
  data
}: {
  data: AssetExtended
}): ReactElement {
  const { approvedBaseTokens } = useMarketMetadata()
  const services = data.credentialSubject?.services || []
  const [fetchedTokenSymbols, setFetchedTokenSymbols] = useState<
    Record<string, string>
  >({})
  const approvedTokenSymbolMap = useMemo(() => {
    const map: Record<string, string> = {}
    approvedBaseTokens?.forEach((token) => {
      if (!token?.address || !token?.symbol) return
      map[token.address.toLowerCase()] = token.symbol
    })
    return map
  }, [approvedBaseTokens])
  const priceTokenAddresses = useMemo(
    () => getAssetPriceTokenAddresses(data),
    [data]
  )
  const priceTokenAddressKey = priceTokenAddresses.join('|')
  const tokenSymbolMap = useMemo(
    () => ({ ...approvedTokenSymbolMap, ...fetchedTokenSymbols }),
    [approvedTokenSymbolMap, fetchedTokenSymbols]
  )

  useEffect(() => {
    const missingTokenAddresses = priceTokenAddresses.filter(
      (address) => !tokenSymbolMap[address]
    )

    if (!missingTokenAddresses.length) return

    const chainId = data.credentialSubject?.chainId
    const nodeUri = getOceanConfig(chainId)?.nodeUri
    if (!nodeUri) return

    let cancelled = false
    const provider = new JsonRpcProvider(nodeUri)

    async function resolveMissingTokenSymbols() {
      const entries = await Promise.all(
        missingTokenAddresses.map(async (address) => {
          const tokenInfo = await getTokenInfo(address, provider)
          return [address, tokenInfo?.symbol || ''] as const
        })
      )

      if (cancelled) return

      setFetchedTokenSymbols((current) => {
        const next = { ...current }
        let changed = false
        entries.forEach(([address, symbol]) => {
          if (symbol && symbol !== '???' && current[address] !== symbol) {
            next[address] = symbol
            changed = true
          }
        })
        return changed ? next : current
      })
    }

    resolveMissingTokenSymbols()

    return () => {
      cancelled = true
    }
  }, [
    data.credentialSubject?.chainId,
    priceTokenAddressKey,
    priceTokenAddresses,
    tokenSymbolMap
  ])

  if (!services.length) {
    return (
      <div className={styles.expanded}>
        <div className={styles.servicesCard}>No services for this asset.</div>
      </div>
    )
  }

  return (
    <div className={styles.expanded}>
      <div className={styles.servicesCard}>
        <div className={styles.expandedHeader}>
          <div className={styles.expandedNameHeader}>Service name</div>
          <div className={styles.expandedServiceId}>Service ID</div>
          <div className={styles.expandedType}>Type</div>
          <div className={styles.expandedDatatoken}>Datatoken</div>
          <div className={styles.expandedSales}>Sales</div>
          <div className={styles.expandedPrice}>Price</div>
          <div className={styles.expandedRevenue}>Revenue</div>
        </div>
        {services.map((service, index) => {
          const serviceStats = getServiceStats(
            data,
            index,
            service.id,
            service.datatokenAddress
          ) as HistoryServiceStats | undefined
          const price = getServicePrice(
            data,
            index,
            service.id,
            serviceStats,
            tokenSymbolMap
          )
          const sales = serviceStats?.orders || 0
          const revenue = sales * price.value
          const isCompute = service.type === 'compute'
          const typeLabel = isCompute ? 'Compute' : 'Download'

          return (
            <div
              className={styles.expandedRow}
              key={service.id || `service-${index}`}
            >
              <div className={styles.expandedName}>
                <span className={styles.serviceNameText} title={service.name}>
                  {service.name || `Service ${index + 1}`}
                </span>
              </div>
              <div className={styles.expandedServiceId}>
                <span className={styles.identifier} title={service.id}>
                  {truncateDid(service.id)}
                </span>
              </div>
              <div className={styles.expandedType}>
                <span>{typeLabel}</span>
              </div>
              <div className={styles.expandedDatatoken}>
                {serviceStats?.symbol || ''}
              </div>
              <div className={styles.expandedSales}>{sales}</div>
              <div className={styles.expandedPrice}>
                {formatPrice(price.value, price.tokenSymbol)}
              </div>
              <div className={styles.expandedRevenue}>
                {formatRevenue(revenue, price.tokenSymbol)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
