import { Asset } from './Asset'
import { Metadata } from './ddo/Metadata'
import { Service } from './ddo/Service'

export interface ServicePrice {
  type: 'fixedrate' | 'dispenser'
  price: string
  contract: string
  token?: TokenInfo
  exchangeId?: string
}

export interface ServiceStat {
  datatokenAddress: string
  name: string
  symbol: string
  serviceId: string
  orders: number
  prices: ServicePrice[]
}

export interface OffChain {
  stats: {
    services: ServiceStat[]
  }
}

export interface AssetExtended extends Asset {
  accessDetails?: AccessDetails[]
  views?: number
  metadata: Metadata
  services: Service[]
  offchain?: OffChain // TODO - in future it will be directly included in Asset type in @oceanprotocol/lib
}
