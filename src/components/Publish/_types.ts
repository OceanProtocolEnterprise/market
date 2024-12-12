import { FileInfo, ServiceComputeOptions } from '@oceanprotocol/lib'
import { NftMetadata } from '@utils/nft'
import { ReactElement } from 'react'
import { License } from 'src/@types/ddo/License'
import { Option } from 'src/@types/ddo/Option'

export interface FormPublishService {
  files: FileInfo[]
  links?: FileInfo[]
  timeout: string
  dataTokenOptions: { name: string; symbol: string }
  access: 'Download' | 'Compute' | string
  providerUrl: { url: string; valid: boolean; custom: boolean }
  algorithmPrivacy?: boolean
  computeOptions?: ServiceComputeOptions
  usesConsumerParameters?: boolean
  consumerParameters?: FormConsumerParameter[]
  allow?: string[]
  deny?: string[]
}

export interface FormPublishData {
  user: {
    stepCurrent: number
    accountId: string
    chainId: number
  }
  metadata: {
    nft: NftMetadata
    transferable: boolean
    type: 'dataset' | 'algorithm'
    name: string
    description: string
    author: string
    termsAndConditions: boolean
    license?: License
    tags?: string[]
    dockerImage?: string
    dockerImageCustom?: string
    dockerImageCustomTag?: string
    dockerImageCustomEntrypoint?: string
    dockerImageCustomChecksum?: string
    usesConsumerParameters?: boolean
    consumerParameters?: FormConsumerParameter[]
    service?: {
      usesConsumerParameters?: boolean
      consumerParameters?: FormConsumerParameter[]
    }
  }
  services: FormPublishService[]
  pricing: PricePublishOptions
  feedback?: PublishFeedback
  useRemoteLicense: boolean
  licenseUrl: FileInfo[]
  uploadedLicense: License
}

export interface StepContent {
  step: number
  title: string
  component: ReactElement
}

export interface PublishFeedback {
  [key: string]: {
    name: string
    description: string
    status: 'success' | 'error' | 'pending' | 'active' | string
    txCount: number
    errorMessage?: string
    txHash?: string
  }
}

export interface MetadataAlgorithmContainer {
  entrypoint: string
  image: string
  tag: string
  checksum: string
}

export interface FormConsumerParameter {
  name: string
  type: 'text' | 'number' | 'boolean' | 'select'
  label: string
  required: string
  description: string
  default: string | boolean | number | Option[]
  options?: { key: string; value: string }[]
  value?: string | boolean | number
}
