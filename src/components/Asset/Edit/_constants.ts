import { FileInfo } from '@oceanprotocol/lib'
import { parseConsumerParameters, secondsToString } from '@utils/ddo'
import { ComputeEditForm, MetadataEditForm, ServiceEditForm } from './_types'
import { Metadata } from 'src/@types/ddo/Metadata'
import { Credential } from 'src/@types/ddo/Credentials'
import { Compute, Service } from 'src/@types/ddo/Service'
import { isCredentialAddressBased } from '@utils/credentials'

export const defaultServiceComputeOptions: Compute = {
  allowRawAlgorithm: false,
  allowNetworkAccess: true,
  publisherTrustedAlgorithmPublishers: [],
  publisherTrustedAlgorithms: []
}

export function getInitialValues(
  metadata: Metadata,
  credentials: Credential,
  assetState: string
): MetadataEditForm {
  const useRemoteLicense =
    metadata.license?.licenseDocuments?.[0]?.mirrors?.[0]?.type !== 'url'

  let fileInfo: FileInfo
  if (
    !useRemoteLicense &&
    metadata.license?.licenseDocuments?.[0].mirrors?.[0]
  ) {
    const licenseItem = metadata.license?.licenseDocuments?.[0]
    fileInfo = {
      type: licenseItem.mirrors[0].type,
      checksum: licenseItem.sha256,
      contentLength: '',
      contentType: licenseItem.fileType,
      index: 0,
      method: licenseItem.mirrors[0].method,
      url: licenseItem.mirrors[0].url,
      valid: true
    }
  }

  let newAllowAddresses = []
  let newDenyAddresses = []
  if (credentials) {
    credentials.allow?.forEach((allowCredential) => {
      if (isCredentialAddressBased(allowCredential)) {
        newAllowAddresses = [...newAllowAddresses, ...allowCredential.values]
      }
    })
    credentials.deny?.forEach((denyCredential) => {
      if (isCredentialAddressBased(denyCredential)) {
        newDenyAddresses = [...newDenyAddresses, ...denyCredential.values]
      }
    })
    newAllowAddresses = Array.from(new Set(newAllowAddresses))
    newDenyAddresses = Array.from(new Set(newDenyAddresses))
  }

  console.log(metadata)

  return {
    name: metadata?.name,
    description: metadata?.description?.['@value'],
    type: metadata?.type,
    links: [{ url: '', type: 'url' }],
    author: metadata?.author,
    tags: metadata?.tags,
    usesConsumerParameters: metadata?.algorithm?.consumerParameters
      ? Object.values(metadata?.algorithm?.consumerParameters).length > 0
      : false,
    consumerParameters: parseConsumerParameters(
      metadata?.algorithm?.consumerParameters
    ),
    allow: newAllowAddresses,
    deny: newDenyAddresses,
    assetState,
    licenseUrl: !useRemoteLicense ? [fileInfo] : undefined,
    uploadedLicense: useRemoteLicense ? metadata.license : undefined,
    useRemoteLicense
  }
}

function getComputeSettingsInitialValues({
  publisherTrustedAlgorithms,
  publisherTrustedAlgorithmPublishers
}: Compute): ComputeEditForm {
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

  let allowAdresses = []
  let denyAddresses = []
  if (service.credentials) {
    service.credentials.allow?.forEach((allowCredential) => {
      if (isCredentialAddressBased(allowCredential)) {
        allowAdresses = [...allowAdresses, ...allowCredential.values]
      }
    })
    service.credentials.deny?.forEach((denyCredential) => {
      if (isCredentialAddressBased(denyCredential)) {
        denyAddresses = [...denyAddresses, ...denyCredential.values]
      }
    })
    allowAdresses = Array.from(new Set(allowAdresses))
    denyAddresses = Array.from(new Set(denyAddresses))
  }

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
    usesConsumerParameters: service.consumerParameters
      ? Object.assign(service.consumerParameters).length > 0
      : undefined,
    consumerParameters: parseConsumerParameters(service.consumerParameters),
    allow: allowAdresses,
    deny: denyAddresses,
    ...computeSettings
  }
}
