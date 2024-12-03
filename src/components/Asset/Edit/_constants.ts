import { ServiceComputeOptions } from '@oceanprotocol/lib'
import { parseConsumerParameters, secondsToString } from '@utils/ddo'
import { ComputeEditForm, MetadataEditForm, ServiceEditForm } from './_types'
import { Metadata } from 'src/@types/ddo/Metadata'
import { Credentials } from 'src/@types/ddo/Credentials'
import { Service } from 'src/@types/ddo/Service'

export const defaultServiceComputeOptions: ServiceComputeOptions = {
  allowRawAlgorithm: false,
  allowNetworkAccess: true,
  publisherTrustedAlgorithmPublishers: [],
  publisherTrustedAlgorithms: []
}

export function getInitialValues(
  metadata: Metadata,
  credentials: Credentials,
  assetState: string
): MetadataEditForm {
  return {
    name: metadata?.name,
    description: metadata?.description?.['@value'],
    type: metadata?.type,
    links: [{ url: '', type: 'url' }],
    author: metadata?.author,
    tags: metadata?.tags,
    usesConsumerParameters: metadata?.algorithm?.consumerParameters?.length > 0,
    consumerParameters: parseConsumerParameters(
      metadata?.algorithm?.consumerParameters
    ),
    allow:
      credentials?.allow?.find((credential) => credential.type === 'address')
        ?.values || [],
    deny:
      credentials?.deny?.find((credential) => credential.type === 'address')
        ?.values || [],
    assetState,
    license: metadata?.license?.name
  }
}

function getComputeSettingsInitialValues({
  publisherTrustedAlgorithms,
  publisherTrustedAlgorithmPublishers
}: ServiceComputeOptions): ComputeEditForm {
  const allowAllPublishedAlgorithms = publisherTrustedAlgorithms === null
  const publisherTrustedAlgorithmsForForm = allowAllPublishedAlgorithms
    ? null
    : publisherTrustedAlgorithms.map((algo) => algo.did)

  return {
    allowAllPublishedAlgorithms,
    publisherTrustedAlgorithms: publisherTrustedAlgorithmsForForm || [],
    publisherTrustedAlgorithmPublishers
  }
}

export const getNewServiceInitialValues = (
  accountId: string,
  firstService: Service
): ServiceEditForm => {
  const computeSettings = getComputeSettingsInitialValues(
    defaultServiceComputeOptions
  )
  return {
    name: 'New Service',
    description: '',
    access: 'access',
    price: 1,
    paymentCollector: accountId,
    providerUrl: {
      url: firstService.serviceEndpoint,
      valid: false,
      custom: false
    },
    files: [{ url: '', type: 'hidden' }],
    timeout: '1 day',
    usesConsumerParameters: false,
    consumerParameters: [],
    allow: [],
    deny: [],
    ...computeSettings
  }
}

export const getServiceInitialValues = (
  service: Service,
  accessDetails: AccessDetails
): ServiceEditForm => {
  const computeSettings = getComputeSettingsInitialValues(
    service.compute || defaultServiceComputeOptions
  )
  return {
    name: service.name,
    description: service.description?.['@value'],
    access: service.type as 'access' | 'compute',
    price: parseFloat(accessDetails.price),
    paymentCollector: accessDetails.paymentCollector,
    providerUrl: {
      url: service.serviceEndpoint,
      valid: true,
      custom: false
    },
    files: [{ url: '', type: 'hidden' }],
    timeout: secondsToString(service.timeout),
    usesConsumerParameters: service.consumerParameters?.length > 0,
    consumerParameters: parseConsumerParameters(service.consumerParameters),
    allow:
      service.credentials?.allow?.find(
        (credential) => credential.type === 'address'
      )?.values || [],
    deny:
      service.credentials?.deny?.find(
        (credential) => credential.type === 'address'
      )?.values || [],
    ...computeSettings
  }
}
