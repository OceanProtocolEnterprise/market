import { FormConsumerParameter } from '@components/Publish/_types'
import { FileInfo } from '@oceanprotocol/lib'
import { License } from '../../../@types/ddo/License'

export interface MetadataEditForm {
  name: string
  description: string
  type: 'dataset' | 'algorithm'
  links?: FileInfo[]
  author?: string
  tags?: string[]
  usesConsumerParameters?: boolean
  consumerParameters?: FormConsumerParameter[]
  allow?: string[]
  deny?: string[]
  assetState?: string
  license?: License
}

export interface ServiceEditForm {
  name: string
  description: string
  access: 'access' | 'compute'
  providerUrl: { url: string; valid: boolean; custom: boolean }
  price: number
  paymentCollector: string
  files: FileInfo[]
  timeout: string
  usesConsumerParameters: boolean
  consumerParameters: FormConsumerParameter[]
  allow: string[]
  deny: string[]
  // compute
  allowAllPublishedAlgorithms: boolean
  publisherTrustedAlgorithms: string[]
  publisherTrustedAlgorithmPublishers: string[]
}

// TODO delete
export interface ComputeEditForm {
  allowAllPublishedAlgorithms: boolean
  publisherTrustedAlgorithms: string[]
  publisherTrustedAlgorithmPublishers: string[]
}
