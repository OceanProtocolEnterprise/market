import {
  MetadataEditForm,
  ServiceEditForm
} from '@components/Asset/Edit/_types'
import {
  FormConsumerParameter,
  FormPublishData
} from '@components/Publish/_types'
import {
  Arweave,
  FileInfo,
  GraphqlQuery,
  Ipfs,
  LoggerInstance,
  Smartcontract,
  UrlFile
} from '@oceanprotocol/lib'
import { checkJson } from './codemirror'
import { Asset } from 'src/@types/Asset'
import { Service } from 'src/@types/ddo/Service'
import { Option } from 'src/@types/ddo/Option'
import { isCredentialAddressBased } from './credentials'
import { CredentialAddressBased } from 'src/@types/ddo/Credentials'

export function isValidDid(did: string): boolean {
  const regex = /^did:ope:[A-Za-z0-9]{64}$/
  return regex.test(did)
}

// TODO: this function doesn't make sense, since market is now supporting multiple services. We should remove it after checking all the flows where it's being used.
export function getServiceByName(
  ddo: Asset,
  name: 'access' | 'compute'
): Service {
  if (!ddo) return

  const service = ddo.credentialSubject?.services.filter(
    (service) => service.type === name
  )[0]
  return service
}

export function getServiceById(ddo: Asset, serviceId: string): Service {
  if (!ddo) return

  const service = ddo.credentialSubject?.services.find(
    (s) => s.id === serviceId
  )
  return service
}

export function mapTimeoutStringToSeconds(timeout: string): number {
  switch (timeout) {
    case 'Forever':
      return 0
    case '1 day':
      return 86400
    case '1 week':
      return 604800
    case '1 month':
      return 2630000
    case '1 year':
      return 31556952
    default:
      return 0
  }
}

function numberEnding(number: number): string {
  return number > 1 ? 's' : ''
}

export function secondsToString(numberOfSeconds: number): string {
  if (numberOfSeconds === 0) return 'Forever'

  const years = Math.floor(numberOfSeconds / 31536000)
  const months = Math.floor((numberOfSeconds %= 31536000) / 2630000)
  const weeks = Math.floor((numberOfSeconds %= 31536000) / 604800)
  const days = Math.floor((numberOfSeconds %= 604800) / 86400)
  const hours = Math.floor((numberOfSeconds %= 86400) / 3600)
  const minutes = Math.floor((numberOfSeconds %= 3600) / 60)
  const seconds = numberOfSeconds % 60

  return years
    ? `${years} year${numberEnding(years)}`
    : months
    ? `${months} month${numberEnding(months)}`
    : weeks
    ? `${weeks} week${numberEnding(weeks)}`
    : days
    ? `${days} day${numberEnding(days)}`
    : hours
    ? `${hours} hour${numberEnding(hours)}`
    : minutes
    ? `${minutes} minute${numberEnding(minutes)}`
    : seconds
    ? `${seconds} second${numberEnding(seconds)}`
    : 'less than a second'
}

// this is required to make it work properly for preview/publish/edit/debug.
// TODO: find a way to only have FileInfo interface instead of FileExtended
interface FileExtended extends FileInfo {
  url?: string
  query?: string
  transactionId?: string
  address?: string
  abi?: string
  headers?: { key: string; value: string }[]
}

export function normalizeFile(
  storageType: string,
  file: FileExtended,
  chainId: number
) {
  let fileObj
  const headersProvider = {}
  const headers = file[0]?.headers || file?.headers
  if (headers && headers.length > 0) {
    headers.map((el) => {
      headersProvider[el.key] = el.value
      return el
    })
  }
  switch (storageType) {
    case 'ipfs': {
      fileObj = {
        type: storageType,
        hash: file[0]?.url || file?.url
      } as Ipfs
      break
    }
    case 'arweave': {
      fileObj = {
        type: storageType,
        transactionId:
          file[0]?.url ||
          file?.url ||
          file[0]?.transactionId ||
          file?.transactionId
      } as Arweave
      break
    }
    case 'graphql': {
      fileObj = {
        type: storageType,
        url: file[0]?.url || file?.url,
        query: file[0]?.query || file?.query,
        headers: headersProvider
      } as GraphqlQuery
      break
    }
    case 'smartcontract': {
      // clean obj
      fileObj = {
        chainId,
        type: storageType,
        address: file[0]?.address || file?.address || file[0]?.url || file?.url,
        abi: checkJson(file[0]?.abi || file?.abi)
          ? JSON.parse(file[0]?.abi || file?.abi)
          : file[0]?.abi || file?.abi
      } as Smartcontract
      break
    }
    default: {
      fileObj = {
        type: 'url',
        index: 0,
        url: file ? file[0]?.url || file?.url : null,
        headers: headersProvider,
        method: file.method
      } as UrlFile
      break
    }
  }
  return fileObj
}

export function previewDebugPatch(
  values: FormPublishData | MetadataEditForm | ServiceEditForm
) {
  // handle file's object property dynamically
  // without braking Yup and type validation
  const buildValuesPreview = JSON.parse(JSON.stringify(values))

  return buildValuesPreview
}

export function parseConsumerParameters(
  consumerParameters: Record<string, string | number | boolean | Option[]>[]
): FormConsumerParameter[] {
  if (!consumerParameters) {
    return []
  }

  return consumerParameters.map((param) => {
    let transformedOptions
    if (Array.isArray(param.options)) {
      transformedOptions = param.options.map((option) => {
        const key = Object.keys(option)[0]
        return {
          key,
          value: option[key]
        }
      })
    }
    return {
      ...param,
      required: param.required ? 'required' : 'optional',
      options: param.type === 'select' ? transformedOptions : [],
      default:
        param.type === 'boolean'
          ? param.default === 'true'
          : param.type === 'number'
          ? Number(param.default)
          : param.default
    }
  })
}

export function isAddressWhitelisted(
  ddo: Asset,
  accountId: string,
  service?: Service
): boolean {
  if (!ddo || !accountId) return false

  if (!ddo.credentialSubject.credentials) {
    LoggerInstance.error('The asset has no credentials property')
    return false
  }

  if (service && !service.credentials) {
    LoggerInstance.error('The selected service has no credentials property')
    return false
  }

  // All addresses can access
  const { credentials } = ddo.credentialSubject

  const allowCredentials: CredentialAddressBased = isCredentialAddressBased(
    credentials?.allow?.[0]
  )
    ? (credentials?.allow?.[0] as CredentialAddressBased)
    : undefined
  const denyCredentials: CredentialAddressBased = isCredentialAddressBased(
    credentials?.deny?.[0]
  )
    ? (credentials?.deny?.[0] as CredentialAddressBased)
    : undefined

  const serviceAllowCredentials: CredentialAddressBased =
    isCredentialAddressBased(service?.credentials?.allow?.[0])
      ? (service?.credentials?.allow?.[0] as CredentialAddressBased)
      : undefined
  const serviceDenyCredentials: CredentialAddressBased =
    isCredentialAddressBased(service?.credentials?.deny?.[0])
      ? (service?.credentials?.deny?.[0] as CredentialAddressBased)
      : undefined

  const useWhiteList =
    allowCredentials?.values.length > 0 ||
    serviceAllowCredentials?.values.length > 0

  let isAddressWhitelisted = false
  if (useWhiteList) {
    credentials?.allow?.forEach((allowCredential) => {
      if (isAddressWhitelisted) {
        return
      }

      if (isCredentialAddressBased(allowCredential)) {
        if (
          allowCredential.values.some(
            (address) => address.toLowerCase() === accountId.toLowerCase()
          )
        ) {
          isAddressWhitelisted = true
        }
      }
    })

    service?.credentials?.allow?.forEach((allowCredential) => {
      if (isAddressWhitelisted) {
        return
      }

      if (isCredentialAddressBased(allowCredential)) {
        if (
          allowCredential.values.some(
            (address) => address.toLowerCase() === accountId.toLowerCase()
          )
        ) {
          isAddressWhitelisted = true
        }
      }
    })

    service?.credentials?.allow?.forEach((allowCredential) => {
      if (isAddressWhitelisted) {
        return
      }

      if (isCredentialAddressBased(allowCredential)) {
        if (
          allowCredential.values.some(
            (address) => address.toLowerCase() === accountId.toLowerCase()
          )
        ) {
          isAddressWhitelisted = true
        }
      }
    })
  }

  const useBlackList =
    denyCredentials?.values.length > 0 ||
    serviceDenyCredentials?.values.length > 0

  let isAddressBlacklisted = false
  if (useBlackList) {
    credentials?.deny?.forEach((denyCredential) => {
      if (isAddressBlacklisted) {
        return
      }

      if (isCredentialAddressBased(denyCredential)) {
        if (
          denyCredential.values.some(
            (address) => address.toLowerCase() === accountId.toLowerCase()
          )
        ) {
          isAddressBlacklisted = true
        }
      }
    })

    service?.credentials?.deny?.forEach((denyCredential) => {
      if (isAddressBlacklisted) {
        return
      }

      if (isCredentialAddressBased(denyCredential)) {
        if (
          denyCredential.values.some(
            (address) => address.toLowerCase() === accountId.toLowerCase()
          )
        ) {
          isAddressBlacklisted = true
        }
      }
    })

    service?.credentials?.deny?.forEach((denyCredential) => {
      if (isAddressBlacklisted) {
        return
      }

      if (isCredentialAddressBased(denyCredential)) {
        if (
          denyCredential.values.some(
            (address) => address.toLowerCase() === accountId.toLowerCase()
          )
        ) {
          isAddressBlacklisted = true
        }
      }
    })
  }

  return (
    (useWhiteList ? isAddressWhitelisted : true) &&
    (useBlackList ? !isAddressBlacklisted : true)
  )
}
