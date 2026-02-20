import { Metadata } from './Metadata'
import { Service } from './Service'
import { Event } from './Event'
import { Credential } from './Credentials'
import { AssetDatatoken } from '../Asset'
import { License } from './License'

export interface CredentialSubject {
  license?: License
  metadata: Metadata
  services: Service[]
  credentials: Credential
  chainId: number
  nftAddress: string
  dataspace?: string
  event?: Event
  datatokens?: AssetDatatoken[]
}
