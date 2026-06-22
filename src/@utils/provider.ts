import {
  ArweaveFileObject,
  ComputeAlgorithm,
  ComputeEnvironment,
  ComputeOutput,
  FileInfo,
  IpfsFileObject,
  LoggerInstance,
  ProviderInstance,
  UrlFileObject,
  UserCustomParameters,
  getErrorMessage,
  S3FileObject,
  FtpFileObject
} from '@oceanprotocol/lib'
// if customProviderUrl is set, we need to call provider using this custom endpoint
import { customProviderUrl } from '../../app.config.cjs'
import { KeyValuePair } from '@shared/FormInput/InputElement/KeyValueInput'
import { Signer } from 'ethers'
import { getValidUntilTime } from './compute'
import { toast } from 'react-toastify'
import { Service } from 'src/@types/ddo/Service'
import { AssetExtended } from 'src/@types/AssetExtended'
import { ResourceType } from 'src/@types/ResourceType'
import {
  PolicyServerInitiateActionData,
  PolicyServerInitiateComputeActionData
} from 'src/@types/PolicyServer'
import { resolveVerifierSessionId } from './verifierSession'
import { SignerServerEoaSigner } from './wallet/signerServerEoaSigner'

const ENCRYPTED_PROVIDER_RESPONSE = /^0x[0-9a-fA-F]*$/
const PROVIDER_ENCRYPT_RETRIES = 3
const PROVIDER_ENCRYPT_RETRY_DELAY_MS = 1000

export type KnownStorageType =
  | 's3'
  | 'ipfs'
  | 'arweave'
  | 'url'
  | 'ftp'
  | 'smartcontract'
  | 'graphql'
  | 'hidden'
  | 'ftp'

export type StorageType = KnownStorageType | (string & unknown)

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getProviderEncryptError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Provider encrypt failed.'
}

function normalizeProviderEncryptResponse(response: string): string {
  if (ENCRYPTED_PROVIDER_RESPONSE.test(response)) return response

  throw new Error(getErrorMessage(response))
}

function shouldRetryProviderEncrypt(error: unknown, signer: Signer) {
  if (!(signer instanceof SignerServerEoaSigner)) return false

  const message = getProviderEncryptError(error).toLowerCase()
  return (
    message.includes('encrypt for') ||
    message.includes('was denied') ||
    message.includes('could not sign persistent storage request')
  )
}

export async function encryptProviderData(
  data: unknown,
  chainId: number,
  providerUrl: string,
  signer: Signer
): Promise<string> {
  let lastError: unknown

  for (let attempt = 1; attempt <= PROVIDER_ENCRYPT_RETRIES; attempt++) {
    try {
      const response = await ProviderInstance.encrypt(
        data,
        chainId,
        providerUrl,
        signer
      )
      return normalizeProviderEncryptResponse(response)
    } catch (error) {
      lastError = error
      if (
        attempt === PROVIDER_ENCRYPT_RETRIES ||
        !shouldRetryProviderEncrypt(error, signer)
      ) {
        break
      }

      await sleep(PROVIDER_ENCRYPT_RETRY_DELAY_MS * attempt)
    }
  }

  throw new Error(getProviderEncryptError(lastError))
}

export async function initializeProviderForComputeMulti(
  datasets:
    | {
        asset: AssetExtended
        service: Service
        accessDetails: AccessDetails
        sessionId: string
      }[]
    | undefined,
  algorithm: AssetExtended,
  algoSessionId: string,
  accountId: Signer,
  computeEnv: ComputeEnvironment,
  selectedResources: ResourceType,
  svcIndexAlgo: number,
  paymentTokenAddress: string,
  computeOutput?: ComputeOutput,
  queueMaxWaitTime?: number,
  algoParams?: Record<string, any>,
  datasetParams?: Record<string, any>
) {
  const safeDatasets = datasets ?? []
  const computeAssets = safeDatasets.map(
    ({ asset, service, accessDetails }) => ({
      documentId: asset.id,
      serviceId: service.id,
      transferTxId: accessDetails.validOrderTx,
      userdata: datasetParams
    })
  )

  const computeAlgo: ComputeAlgorithm = {
    documentId: algorithm.id,
    serviceId: algorithm.credentialSubject.services[svcIndexAlgo].id,
    transferTxId: algorithm.accessDetails[svcIndexAlgo].validOrderTx,
    userdata: algoParams
  }

  const policiesServer: PolicyServerInitiateComputeActionData[] = [
    ...safeDatasets.map(({ asset, service, sessionId }) => ({
      documentId: asset.id,
      serviceId: service.id,
      sessionId: resolveVerifierSessionId(asset.id, service.id, sessionId),
      successRedirectUri: '',
      errorRedirectUri: '',
      responseRedirectUri: '',
      presentationDefinitionUri: ''
    })),
    {
      documentId: algorithm.id,
      serviceId: algorithm.credentialSubject.services[svcIndexAlgo].id,
      sessionId: resolveVerifierSessionId(
        algorithm.id,
        algorithm.credentialSubject.services[svcIndexAlgo].id,
        algoSessionId
      ),
      successRedirectUri: '',
      errorRedirectUri: '',
      responseRedirectUri: '',
      presentationDefinitionUri: ''
    }
  ]

  const validUntil = getValidUntilTime(
    selectedResources.jobDuration,
    safeDatasets[0]?.service.timeout ?? 0,
    algorithm.credentialSubject.services[svcIndexAlgo].timeout
  )

  const providerUrl =
    safeDatasets[0]?.service.serviceEndpoint ||
    algorithm.credentialSubject.services[svcIndexAlgo].serviceEndpoint ||
    customProviderUrl
  const chainId =
    safeDatasets[0]?.asset.credentialSubject.chainId ??
    algorithm.credentialSubject.chainId

  const resources =
    selectedResources.mode === 'free'
      ? computeEnv.free.resources.map((res) => ({
          id: res.id,
          amount: selectedResources?.[res.id] || res.max
        }))
      : computeEnv.resources.map((res) => ({
          id: res.id,
          amount: selectedResources?.[res.id] || res.min
        }))
  return await ProviderInstance.initializeCompute(
    computeAssets,
    computeAlgo,
    computeEnv.id,
    paymentTokenAddress,
    validUntil,
    providerUrl,
    await accountId.getAddress(),
    resources,
    chainId,
    policiesServer,
    null,
    queueMaxWaitTime,
    null,
    computeOutput
  )
}

export async function getEncryptedFiles(
  files: any,
  chainId: number,
  providerUrl: string,
  signer: Signer
): Promise<string> {
  try {
    const filesForEncryption = {
      ...files,
      files: files.files.map((file: any) => {
        const cleanFile = { ...file }
        if (!cleanFile.type) cleanFile.type = 'url'
        return cleanFile
      })
    }
    const response = await encryptProviderData(
      filesForEncryption,
      chainId,
      providerUrl,
      signer
    )
    return response
  } catch (error) {
    const message = getErrorMessage(error.message)
    console.error('[getEncryptedFiles] Error:', {
      error,
      message,
      files: JSON.stringify(files),
      providerUrl,
      chainId
    })
    LoggerInstance.error('[Provider Encrypt] Error:', message)
    toast.error(message)
    throw error
  }
}

export async function getFileDidInfo(
  did: string,
  serviceId: string,
  providerUrl: string,
  withChecksum = false
): Promise<FileInfo[]> {
  try {
    const response = await ProviderInstance.checkDidFiles(
      did,
      serviceId,
      providerUrl,
      withChecksum
    )
    return response
  } catch (error) {
    console.error('Error check did files', error)
    const message = 'Failed to fetch file info from provider'
    LoggerInstance.error('[Initialize check file did] Error:', message)
    throw new Error(`[Initialize check file did] Error: ${message}`)
  }
}

export async function getFileInfo(
  file: string,
  providerUrl: string,
  storageType: StorageType,
  query?: string,
  headers?: KeyValuePair[],
  abi?: string,
  chainId?: number,
  method?: string,
  s3Config?: S3FileObject,
  withChecksum = false
): Promise<FileInfo[]> {
  let response: FileInfo[] = []
  const headersProvider: { [key: string]: string } = {}
  if (headers?.length) {
    headers.forEach((el) => {
      headersProvider[el.key] = el.value
    })
  }

  switch (storageType) {
    case 'ipfs': {
      const fileIPFS: IpfsFileObject = {
        type: 'ipfs',
        hash: file
      }
      try {
        response = await ProviderInstance.getFileInfo(
          fileIPFS,
          providerUrl,
          withChecksum
        )
      } catch (error: any) {
        const message = getErrorMessage(error.message)
        LoggerInstance.error('[Provider Get File info] Error:', message)
        toast.error(message)
      }
      break
    }
    case 'arweave': {
      const fileArweave: ArweaveFileObject = {
        type: 'arweave',
        transactionId: file
      }
      try {
        response = await ProviderInstance.getFileInfo(
          fileArweave,
          providerUrl,
          withChecksum
        )
      } catch (error: any) {
        const message = getErrorMessage(error.message)
        LoggerInstance.error('[Provider Get File info] Error:', message)
        toast.error(message)
      }
      break
    }
    case 's3': {
      try {
        if (!s3Config) {
          throw new Error('S3 configuration is required for S3 file validation')
        }
        response = await ProviderInstance.getFileInfo(
          s3Config,
          providerUrl,
          withChecksum
        )
      } catch (error: any) {
        const message = getErrorMessage(error.message)
        LoggerInstance.error('[S3 File Validation] Error:', message)
        toast.error(message)
        throw error
      }
      break
    }
    case 'ftp': {
      const fileFtp: FtpFileObject = {
        type: 'ftp',
        url: file
      }
      try {
        response = await ProviderInstance.getFileInfo(
          fileFtp,
          providerUrl,
          withChecksum
        )
      } catch (error: any) {
        const message = getErrorMessage(error.message)
        LoggerInstance.error('[Provider Get File info] Error:', message)
        toast.error(message)
      }
      break
    }
    default: {
      const fileUrl: UrlFileObject = {
        type: storageType === 'url' ? 'url' : storageType,
        url: file,
        headers: headersProvider,
        method: method || 'get'
      } as UrlFileObject
      try {
        response = await ProviderInstance.getFileInfo(
          fileUrl,
          providerUrl,
          withChecksum
        )
      } catch (error: any) {
        const message = getErrorMessage(error.message)
        LoggerInstance.error('[Provider Get File info] Error:', message)
        toast.error(message)
      }
      break
    }
  }
  return response
}

export async function downloadFile(
  signer: Signer,
  asset: AssetExtended,
  service: Service,
  accessDetails: AccessDetails,
  accountId: string,
  verifierSessionId: string,
  validOrderTx?: string,
  userCustomParameters?: UserCustomParameters
) {
  let downloadUrl
  let fileName = `asset_${asset.id}.dat`

  const policyServer: PolicyServerInitiateActionData = {
    sessionId: verifierSessionId,
    successRedirectUri: ``,
    errorRedirectUri: ``,
    responseRedirectUri: ``,
    presentationDefinitionUri: ``
  }

  try {
    downloadUrl = await ProviderInstance.getDownloadUrl(
      asset.id,
      service.id,
      0,
      validOrderTx || accessDetails.validOrderTx,
      service.serviceEndpoint || customProviderUrl,
      signer,
      policyServer,
      userCustomParameters
    )
    const fileInfo: any = await getFileDidInfo(
      asset.id,
      service.id,
      service.serviceEndpoint || customProviderUrl
    )
    const mimeExtensionMap: Record<string, string> = {
      'application/json': 'json',
      'application/vnd.api+json': 'json',
      'text/csv': 'csv',
      'application/pdf': 'pdf',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'text/plain': 'txt',
      'application/octet-stream': 'bin'
    }

    if (Array.isArray(fileInfo) && fileInfo.length > 0) {
      const info = fileInfo[0]

      if (info.name) {
        fileName = info.name
      } else if (info.url) {
        fileName = info.url.split('/').pop() || fileName
      } else if (info.contentType) {
        const cleanContentType = info.contentType.split(';')[0].trim()
        const mappedExt = mimeExtensionMap[cleanContentType]

        if (mappedExt) {
          fileName = `asset_${asset.id}.${mappedExt}`
        } else {
          const guessed = cleanContentType.split('/').pop()
          fileName = `asset_${asset.id}.${guessed || 'dat'}`
        }
      }
    }

    fileName = fileName.replace(/[<>:"/\\|?*]+/g, '_')
  } catch (error) {
    const message = getErrorMessage(error.message)
    LoggerInstance.error('[Provider Get download url] Error:', message)
    toast.error(message)
    return
  }

  try {
    const response = await fetch(downloadUrl)
    if (!response.ok) throw new Error('Failed to fetch file.')

    const blob = await response.blob()
    const blobUrl = window.URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = blobUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(blobUrl)
  } catch (error) {
    const message = getErrorMessage(error.message)
    LoggerInstance.error('[Download File Error]', message)
    toast.error(message)
  }
}

export async function checkValidProvider(
  providerUrl: string
): Promise<boolean> {
  try {
    const response = await ProviderInstance.isValidProvider(providerUrl)
    return response
  } catch (error) {
    const message = getErrorMessage(error.message)
    LoggerInstance.error('[Provider Check] Error:', message)
    toast.error(message)
  }
}

export async function getComputeEnvironments(
  providerUrl: string,
  chainId: number
): Promise<ComputeEnvironment[]> {
  try {
    const response = await ProviderInstance.getComputeEnvironments(providerUrl)
    const computeEnvs = Array.isArray(response) ? response : response[chainId]

    return computeEnvs
  } catch (error) {
    LoggerInstance.error(`[getComputeEnvironments] ${error.message}`)
  }
}
