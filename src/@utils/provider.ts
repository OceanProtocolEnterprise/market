import {
  Arweave,
  ComputeAlgorithm,
  ComputeEnvironment,
  FileInfo,
  Ipfs,
  LoggerInstance,
  ProviderInstance,
  UrlFile,
  UserCustomParameters,
  getErrorMessage
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
import { S3AccessConfig } from 'src/@types/S3File'
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3'

interface S3FileInfo extends FileInfo {
  name?: string
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
      sessionId,
      successRedirectUri: '',
      errorRedirectUri: '',
      responseRedirectUri: '',
      presentationDefinitionUri: ''
    })),
    {
      documentId: algorithm.id,
      serviceId: algorithm.credentialSubject.services[svcIndexAlgo].id,
      sessionId: algoSessionId,
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
    accountId,
    resources,
    chainId,
    policiesServer
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
    const response = await ProviderInstance.encrypt(
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

async function validateS3File(s3Config: S3AccessConfig): Promise<S3FileInfo[]> {
  try {
    const cleanBucket = s3Config.bucket.trim()
    const cleanObjectKey = s3Config.objectKey.trim()

    const client = new S3Client({
      endpoint: s3Config.endpoint,
      region: s3Config.region || 'us-east-1',
      credentials: {
        accessKeyId: s3Config.accessKeyId.trim(),
        secretAccessKey: s3Config.secretAccessKey.trim()
      },
      forcePathStyle: s3Config.forcePathStyle || false
    })

    const command = new HeadObjectCommand({
      Bucket: cleanBucket,
      Key: cleanObjectKey
    })

    const response = await client.send(command)
    const fileName = cleanObjectKey.split('/').pop() || cleanObjectKey

    const fileInfo: S3FileInfo = {
      type: 's3',
      url: `s3://${cleanBucket}/${cleanObjectKey}`,
      contentType: response.ContentType || 'application/octet-stream',
      contentLength: response.ContentLength?.toString() || '0',
      valid: true,
      method: 'GET',
      checksum: response.ETag?.replace(/"/g, ''),
      name: fileName
    }
    return [fileInfo]
  } catch (error: any) {
    console.error('S3 validation error:', {
      name: error.name,
      message: error.message,
      code: error.Code,
      statusCode: error.$metadata?.httpStatusCode
    })

    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      throw new Error(
        `File not found: ${s3Config.bucket}/${s3Config.objectKey}`
      )
    }
    if (
      error.name === 'AccessDenied' ||
      error.$metadata?.httpStatusCode === 403
    ) {
      throw new Error(
        'Access denied. Check your credentials and bucket permissions'
      )
    }
    throw error
  }
}

export async function getFileInfo(
  file: string,
  providerUrl: string,
  storageType: string,
  query?: string,
  headers?: KeyValuePair[],
  abi?: string,
  chainId?: number,
  method?: string,
  s3Config?: S3AccessConfig,
  withChecksum = false
): Promise<FileInfo[]> {
  let response
  const headersProvider = {}
  if (headers?.length > 0) {
    headers.map((el) => {
      headersProvider[el.key] = el.value
      return el
    })
  }

  switch (storageType) {
    case 'ipfs': {
      const fileIPFS: Ipfs = {
        type: storageType,
        hash: file
      }
      try {
        response = await ProviderInstance.getFileInfo(
          fileIPFS,
          providerUrl,
          withChecksum
        )
      } catch (error) {
        const message = getErrorMessage(error.message)
        LoggerInstance.error('[Provider Get File info] Error:', message)
        toast.error(message)
      }
      break
    }
    case 'arweave': {
      const fileArweave: Arweave = {
        type: storageType,
        transactionId: file
      }
      try {
        response = await ProviderInstance.getFileInfo(
          fileArweave,
          providerUrl,
          withChecksum
        )
      } catch (error) {
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
        response = await validateS3File(s3Config)
      } catch (error) {
        const message = getErrorMessage(error.message)
        LoggerInstance.error('[S3 File Validation] Error:', message)
        toast.error(message)
        throw error
      }
      break
    }
    default: {
      const fileUrl: UrlFile = {
        type: 'url',
        index: 0,
        url: file,
        headers: headersProvider,
        method
      }
      try {
        response = await ProviderInstance.getFileInfo(
          fileUrl,
          providerUrl,
          withChecksum
        )
      } catch (error) {
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
