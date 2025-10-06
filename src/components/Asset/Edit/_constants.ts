import { assetStateToString } from '@utils/assetState'
import { FileInfo, LoggerInstance } from '@oceanprotocol/lib'
import { parseConsumerParameters, secondsToString } from '@utils/ddo'
import { ComputeEditForm, MetadataEditForm, ServiceEditForm } from './_types'
import { Metadata } from 'src/@types/ddo/Metadata'
import { Credential, isVpValue } from 'src/@types/ddo/Credentials'
import { Compute, Service } from 'src/@types/ddo/Service'
import {
  isCredentialAddressBased,
  isCredentialPolicyBased
} from '@utils/credentials'
import appConfig from 'app.config.cjs'
import {
  ArgumentVpPolicy,
  CredentialForm,
  RequestCredentialForm,
  StaticVpPolicy,
  VpPolicyType
} from '@components/@shared/PolicyEditor/types'
import { convertToPolicyType } from '@components/@shared/PolicyEditor/utils'
import { AdditionalVerifiableCredentials } from 'src/@types/ddo/AdditionalVerifiableCredentials'
import { State } from 'src/@types/ddo/State'

export const defaultServiceComputeOptions: Compute = {
  allowRawAlgorithm: false,
  allowNetworkAccess: true,
  publisherTrustedAlgorithmPublishers: [],
  publisherTrustedAlgorithms: []
}

function generateCredentials(
  credentials: Credential,
  type?: string
): CredentialForm {
  const credentialForm: CredentialForm = {
    vpPolicies: [],
    allowInputValue: '',
    denyInputValue: ''
  }
  if (appConfig.ssiEnabled) {
    const requestCredentials: RequestCredentialForm[] = []
    let vcPolicies: string[] = []
    let vpPolicies: VpPolicyType[] = []
    credentials.allow?.forEach((policyCredential) => {
      if (isCredentialPolicyBased(policyCredential)) {
        policyCredential.values.forEach((value) => {
          value.request_credentials.forEach((requestCredential) => {
            let policyTypes = (requestCredential?.policies ?? []).map(
              (policy) => {
                try {
                  const newPolicy = convertToPolicyType(policy, type)
                  return newPolicy
                } catch (error) {
                  LoggerInstance.error(error)
                  return undefined
                }
              }
            )
            policyTypes = policyTypes.filter((item) => !!item)

            const newRequestCredential: RequestCredentialForm = {
              format: requestCredential.format,
              type: requestCredential.type,
              policies: policyTypes
            }
            requestCredentials.push(newRequestCredential)
          })

          const newVpPolicies: VpPolicyType[] = Array.isArray(value.vp_policies)
            ? value.vp_policies.map((policy) => {
                if (isVpValue(policy)) {
                  if (
                    policy.policy === 'external-evp-forward' &&
                    typeof policy.args === 'string'
                  ) {
                    return {
                      type: 'externalEvpForwardVpPolicy',
                      url: policy.args
                    }
                  }
                  const result: ArgumentVpPolicy = {
                    type: 'argumentVpPolicy',
                    policy: policy.policy,
                    args: String(policy.args)
                  }
                  return result
                } else {
                  const result: StaticVpPolicy = {
                    type: 'staticVpPolicy',
                    name: policy
                  }
                  return result
                }
              })
            : []

          vcPolicies = [
            ...vcPolicies,
            ...(Array.isArray(value.vc_policies) ? value.vc_policies : [])
          ]
          vpPolicies = [...vpPolicies, ...newVpPolicies]
        })
      }
    })
    credentialForm.requestCredentials = requestCredentials
    credentialForm.vcPolicies = vcPolicies
    credentialForm.vpPolicies = vpPolicies
  }

  let allowAddresses = []
  credentials.allow?.forEach((allowCredential) => {
    if (isCredentialAddressBased(allowCredential)) {
      const addresses = allowCredential.values.map((item) => item.address)
      allowAddresses = [...allowAddresses, ...addresses]
    }
  })
  allowAddresses = Array.from(new Set(allowAddresses))
  credentialForm.allow = allowAddresses

  let denyAddresses = []
  credentials.deny?.forEach((denyCredential) => {
    if (isCredentialAddressBased(denyCredential)) {
      const addresses = denyCredential.values.map((item) => item.address)
      denyAddresses = [...denyAddresses, ...addresses]
    }
  })
  denyAddresses = Array.from(new Set(denyAddresses))
  credentialForm.deny = denyAddresses
  return credentialForm
}

export function getInitialValues(
  metadata: Metadata,
  credentials: Credential,
  additionalDdos: AdditionalVerifiableCredentials[],
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

  const credentialForm = generateCredentials(credentials, 'edit')
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
    credentials: credentialForm,
    assetState,
    licenseUrl: !useRemoteLicense ? [fileInfo] : [{ url: '', type: 'url' }],
    uploadedLicense: useRemoteLicense ? metadata.license : undefined,
    useRemoteLicense,
    additionalDdos
  }
}

function getComputeSettingsInitialValues({
  publisherTrustedAlgorithms,
  publisherTrustedAlgorithmPublishers
}: Compute): ComputeEditForm {
  // Detect wildcard-based "allow all" configuration
  const hasWildcardPublishers =
    Array.isArray(publisherTrustedAlgorithmPublishers) &&
    publisherTrustedAlgorithmPublishers.includes('*')

  let hasWildcardAlgorithms = false
  if (
    Array.isArray(publisherTrustedAlgorithms) &&
    publisherTrustedAlgorithms.length === 1
  ) {
    const a = (publisherTrustedAlgorithms as any)[0]
    hasWildcardAlgorithms =
      a?.did === '*' &&
      a?.containerSectionChecksum === '*' &&
      a?.filesChecksum === '*' &&
      a?.serviceId === '*'
  }

  const allowAllPublishedAlgorithms =
    hasWildcardPublishers || hasWildcardAlgorithms

  const publisherTrustedAlgorithmsForForm = allowAllPublishedAlgorithms
    ? []
    : publisherTrustedAlgorithms.map((algo) =>
        JSON.stringify({
          algoDid: algo.did,
          serviceId: algo.serviceId
        })
      )

  const publisherTrustedAlgorithmPublishersValue = hasWildcardPublishers
    ? 'Allow all trusted algorithm publishers'
    : 'Allow specific trusted algorithm publishers'

  return {
    allowAllPublishedAlgorithms,
    publisherTrustedAlgorithms: publisherTrustedAlgorithmsForForm,
    publisherTrustedAlgorithmPublishers:
      publisherTrustedAlgorithmPublishersValue,
    publisherTrustedAlgorithmPublishersAddresses: hasWildcardPublishers
      ? ''
      : publisherTrustedAlgorithmPublishers?.join(',') || ''
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
    description: 'New description',
    language: '',
    direction: '',
    access: 'access',
    price: 1,
    paymentCollector: accountId,
    providerUrl: {
      url: firstService.serviceEndpoint,
      valid: false,
      custom: false
    },
    files: [{ url: '', type: 'url' }],
    state: assetStateToString(State.Active),
    timeout: '1 day',
    usesConsumerParameters: false,
    consumerParameters: [],
    credentials: {
      allow: [],
      deny: [],
      allowInputValue: '',
      denyInputValue: '',
      requestCredentials: [],
      vcPolicies: [],
      vpPolicies: []
    },
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
  const credentialForm = generateCredentials(service.credentials, 'edit')
  return {
    name: service.name,
    description: service.description?.['@value'],
    direction: service.description?.['@direction'],
    language: service.description?.['@language'],
    access: service.type as 'access' | 'compute',
    price: isNaN(parseFloat(accessDetails.price))
      ? 0.000001
      : parseFloat(accessDetails.price),
    paymentCollector: accessDetails.paymentCollector,
    providerUrl: {
      url: service.serviceEndpoint,
      valid: true,
      custom: false
    },
    files: [{ url: '', type: 'hidden' }],
    state: assetStateToString(service.state),
    timeout: secondsToString(service.timeout),
    usesConsumerParameters: service.consumerParameters
      ? Object.assign(service.consumerParameters).length > 0
      : undefined,
    consumerParameters: parseConsumerParameters(service.consumerParameters),
    credentials: credentialForm,
    ...computeSettings
  }
}
