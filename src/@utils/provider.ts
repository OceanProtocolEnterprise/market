import {
  Arweave,
  GraphqlQuery,
  Smartcontract,
  ComputeAlgorithm,
  ComputeAsset,
  ComputeEnvironment,
  downloadFileBrowser,
  FileInfo,
  Ipfs,
  LoggerInstance,
  ProviderComputeInitializeResults,
  ProviderInstance,
  UrlFile,
  AbiItem,
  UserCustomParameters,
  getErrorMessage
} from '@oceanprotocol/lib'
// if customProviderUrl is set, we need to call provider using this custom endpoint
import { customProviderUrl } from '../../app.config'
import { KeyValuePair } from '@shared/FormInput/InputElement/KeyValueInput'
import { Signer } from 'ethers'
import { getValidUntilTime } from './compute'
import { toast } from 'react-toastify'
import { Service } from 'src/@types/ddo/Service'
import { AssetExtended } from 'src/@types/AssetExtended'

export async function initializeProviderForCompute(
  dataset: AssetExtended,
  datasetService: Service,
  datasetAccessDetails: AccessDetails,
  algorithm: AssetExtended,
  accountId: string,
  computeEnv: ComputeEnvironment = null
): Promise<ProviderComputeInitializeResults> {
  const computeAsset: ComputeAsset = {
    documentId: dataset.credentialSubject?.id,
    serviceId: datasetService.id,
    transferTxId: datasetAccessDetails.validOrderTx
  }
  const computeAlgo: ComputeAlgorithm = {
    documentId: algorithm.credentialSubject?.id,
    serviceId: algorithm.credentialSubject?.services[0].id,
    transferTxId: algorithm.accessDetails?.[0]?.validOrderTx
  }

  const validUntil = getValidUntilTime(
    computeEnv?.maxJobDuration,
    datasetService.timeout,
    algorithm.credentialSubject.services[0].timeout
  )

  try {
    return await ProviderInstance.initializeCompute(
      [computeAsset],
      computeAlgo,
      computeEnv?.id,
      validUntil,
      customProviderUrl || datasetService.serviceEndpoint,
      accountId
    )
  } catch (error) {
    const message = getErrorMessage(error.message)
    LoggerInstance.error('[Initialize Provider] Error:', message)
    toast.error(message)
    return null
  }
}

// TODO: Why do we have these one line functions ?!?!?!
export async function getEncryptedFiles(
  files: any,
  chainId: number,
  providerUrl: string
): Promise<string> {
  try {
    // https://github.com/oceanprotocol/provider/blob/v4main/API.md#encrypt-endpoint
    const response = await ProviderInstance.encrypt(
      files,
      chainId,
      customProviderUrl || providerUrl
    )
    return response
  } catch (error) {
    const message = getErrorMessage(error.message)
    LoggerInstance.error('[Provider Encrypt] Error:', message)
    toast.error(message)
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
      customProviderUrl || providerUrl,
      withChecksum
    )
    return response
  } catch (error) {
    const message = getErrorMessage(error.message)
    LoggerInstance.error('[Initialize check file did] Error:', message)
    toast.error(`[Initialize check file did] Error: ${message}`)
    throw new Error(`[Initialize check file did] Error: ${message}`)
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
          customProviderUrl || providerUrl,
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
          customProviderUrl || providerUrl,
          withChecksum
        )
      } catch (error) {
        const message = getErrorMessage(error.message)
        LoggerInstance.error('[Provider Get File info] Error:', message)
        toast.error(message)
      }
      break
    }
    case 'graphql': {
      const fileGraphql: GraphqlQuery = {
        type: storageType,
        url: file,
        headers: headersProvider,
        query
      }
      try {
        response = await ProviderInstance.getFileInfo(
          fileGraphql,
          customProviderUrl || providerUrl
        )
      } catch (error) {
        const message = getErrorMessage(error.message)
        LoggerInstance.error('[Provider Get File info] Error:', message)
        toast.error(message)
      }
      break
    }
    case 'smartcontract': {
      // clean obj
      const fileSmartContract: Smartcontract = {
        chainId,
        type: storageType,
        address: file,
        abi: JSON.parse(abi) as AbiItem
      }
      try {
        response = await ProviderInstance.getFileInfo(
          fileSmartContract,
          customProviderUrl || providerUrl
        )
      } catch (error) {
        const message = getErrorMessage(error.message)
        LoggerInstance.error('[Provider Get File info] Error:', message)
        toast.error(message)
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
          customProviderUrl || providerUrl,
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
  validOrderTx?: string,
  userCustomParameters?: UserCustomParameters
) {
  let downloadUrl
  try {
    downloadUrl = await ProviderInstance.getDownloadUrl(
      asset.credentialSubject?.id,
      service.id,
      0,
      validOrderTx || accessDetails.validOrderTx,
      customProviderUrl || service.serviceEndpoint,
      signer,
      userCustomParameters
    )
  } catch (error) {
    const message = getErrorMessage(error.message)
    LoggerInstance.error('[Provider Get download url] Error:', message)
    toast.error(message)
  }
  await downloadFileBrowser(downloadUrl)
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
