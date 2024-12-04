import { LanguageValueObject } from './LanguageValueObject'
import { RemoteObject } from './RemoteObject'
import { State } from './State'
import { Credential } from './Credentials'

export enum ServiceType {
  Access = 'access',
  Compute = 'compute'
}

export interface PublisherTrustedAlgorithms {
  did: string
  serviceId: string
  filesChecksum: string
  containerSectionChecksum: string
}

export interface Compute {
  allowRawAlgorithm: boolean
  allowNetworkAccess: boolean
  publisherTrustedAlgorithmPublishers: string[]
  publisherTrustedAlgorithms: PublisherTrustedAlgorithms[]
}

export interface Service {
  id: string
  type: ServiceType | string
  name: string
  displayName?: LanguageValueObject
  description?: LanguageValueObject
  datatokenAddress: string
  serviceEndpoint: string
  files: string
  timeout: number
  // required for type compute
  compute?: Compute
  consumerParameters?: any
  additionalInformation?: Record<string, string | number | boolean>
  state: State
  credentials: Credential[]
  // Required if type asset
  dataSchema?: RemoteObject
  // Required if type algorithm
  inputSchema?: RemoteObject
  // Required if type algorithm
  outputSchema?: RemoteObject
}
