interface DownloadedAsset {
  dtSymbol: string
  timestamp: number
  networkId: number
  asset: Asset
  downloadedServices: DownloadedService[]
}

interface DownloadedService {
  datatokenAddress: string
  datatokenSymbol?: string
  orderId?: string
  serviceId: string
  serviceIndex: number
  serviceName: string
  serviceTimestamp?: number
  serviceType: string
}
