import {
  Config,
  FreCreationParams,
  DatatokenCreateParams,
  DispenserCreationParams,
  getHash,
  LoggerInstance,
  NftCreateData,
  NftFactory,
  ZERO_ADDRESS,
  getEventFromTx,
  ProviderInstance
} from '@oceanprotocol/lib'
import { mapTimeoutStringToSeconds, normalizeFile } from '@utils/ddo'
import { generateNftCreateData } from '@utils/nft'
import { getEncryptedFiles } from '@utils/provider'
import slugify from 'slugify'
import { algorithmContainerPresets } from './_constants'
import {
  FormConsumerParameter,
  FormPublishData,
  MetadataAlgorithmContainer
} from './_types'
import {
  marketFeeAddress,
  publisherMarketOrderFee,
  publisherMarketFixedSwapFee,
  defaultDatatokenTemplateIndex,
  defaultDatatokenCap
} from '../../../app.config.cjs'
import { sanitizeUrl } from '@utils/url'
import { getContainerChecksum } from '@utils/docker'
import { hexlify, parseEther } from 'ethers/lib/utils'
import { Asset } from 'src/@types/Asset'
import { Service } from 'src/@types/ddo/Service'
import { Metadata } from 'src/@types/ddo/Metadata'
import { Option } from 'src/@types/ddo/Option'
import { createHash } from 'crypto'
import { ethers, Signer } from 'ethers'
import { uploadToIPFS } from '@utils/ipfs'
import { DDOVersion } from 'src/@types/DdoVersion'
import { Credential, CredentialAddressBased } from 'src/@types/ddo/Credentials'
import * as VCDataModel from 'src/@types/ddo/VerifiableCredential'
import { asset } from '.jest/__fixtures__/datasetWithAccessDetails'
import { convertLinks } from '@utils/links'
import { License } from 'src/@types/ddo/License'
import base64url from 'base64url'
import { JWTHeaderParameters } from 'jose'

export function makeDid(nftAddress: string, chainId: string): string {
  return (
    'did:ope:' +
    createHash('sha256')
      .update(ethers.utils.getAddress(nftAddress) + chainId)
      .digest('hex')
  )
}

function getUrlFileExtension(fileUrl: string): string {
  const splittedFileUrl = fileUrl.split('.')
  return splittedFileUrl[splittedFileUrl.length - 1]
}

async function getAlgorithmContainerPreset(
  dockerImage: string
): Promise<MetadataAlgorithmContainer> {
  if (dockerImage === '') return

  const preset = algorithmContainerPresets.find(
    (preset) => `${preset.image}:${preset.tag}` === dockerImage
  )
  preset.checksum = await (
    await getContainerChecksum(preset.image, preset.tag)
  ).checksum
  return preset
}

function dateToStringNoMS(date: Date): string {
  return date.toISOString().replace(/\.[0-9]{3}Z/, 'Z')
}

function transformTags(originalTags: string[]): string[] {
  const transformedTags = originalTags?.map((tag) => slugify(tag).toLowerCase())
  return transformedTags
}

export function transformConsumerParameters(
  parameters: FormConsumerParameter[]
): Record<string, string | number | boolean | Option[]>[] {
  if (!parameters?.length) return

  const transformedValues: Record<
    string,
    string | number | boolean | Option[]
  >[] = parameters.map((param) => {
    const options: Option[] =
      param.type === 'select'
        ? // Transform from { key: string, value: string } into { key: value }
          param.options?.map((opt) => ({ [opt.key]: opt.value }))
        : undefined

    const required = param.required === 'required'

    return {
      ...param,
      options,
      required,
      default: param.default.toString()
    }
  })

  return transformedValues
}

export function generateCredentials(
  oldCredentials: Credential | undefined,
  updatedAllow: string[],
  updatedDeny: string[]
): Credential {
  let newCredentials: Credential
  if (updatedAllow?.length !== 0 || updatedDeny?.length !== 0) {
    const newAllowList: CredentialAddressBased = {
      type: 'address',
      values: updatedAllow
    }

    const newDenyList: CredentialAddressBased = {
      type: 'address',
      values: updatedDeny
    }

    newCredentials = {
      match_deny: 'any',
      allow: [newAllowList],
      deny: [newDenyList]
    }

    return newCredentials
  } else {
    return {
      match_deny: 'any',
      allow: [],
      deny: []
    }
  }
}

export async function transformPublishFormToDdo(
  values: FormPublishData,
  // Those 2 are only passed during actual publishing process
  // so we can always assume if they are not passed, we are on preview.
  datatokenAddress?: string,
  nftAddress?: string
): Promise<Asset> {
  const { metadata, services, user } = values
  const { chainId, accountId } = user
  const {
    type,
    name,
    description,
    tags,
    author,
    termsAndConditions,
    dockerImage,
    dockerImageCustom,
    dockerImageCustomTag,
    dockerImageCustomEntrypoint,
    dockerImageCustomChecksum,
    usesConsumerParameters,
    consumerParameters
  } = metadata
  const { access, files, links, providerUrl, timeout, allow, deny } =
    services[0]

  const currentTime = dateToStringNoMS(new Date())
  const isPreview = !datatokenAddress && !nftAddress

  const algorithmContainerPresets =
    type === 'algorithm' && dockerImage !== '' && dockerImage !== 'custom'
      ? await getAlgorithmContainerPreset(dockerImage)
      : null

  // Transform from files[0].url to string[] assuming only 1 file
  const filesTransformed = files?.length &&
    files[0].valid && [sanitizeUrl(files[0].url)]
  const linksTransformed = links?.length &&
    links[0].valid && [sanitizeUrl(links[0].url)]

  const consumerParametersTransformed = usesConsumerParameters
    ? transformConsumerParameters(consumerParameters)
    : undefined

  let license: License
  if (!values.metadata.useRemoteLicense && values.metadata.licenseUrl[0]) {
    license = {
      name: values.metadata.licenseUrl[0].url,
      licenseDocuments: [
        {
          name: values.metadata.licenseUrl[0].url,
          fileType: values.metadata.licenseUrl[0].contentType,
          sha256: values.metadata.licenseUrl[0].checksum,
          mirrors: [
            {
              type: values.metadata.licenseUrl[0].type,
              method: values.metadata.licenseUrl[0].method,
              url: values.metadata.licenseUrl[0].url
            }
          ]
        }
      ]
    }
  }

  const newMetadata: Metadata = {
    created: currentTime,
    updated: currentTime,
    type,
    name,
    description: {
      '@value': description,
      '@direction': '',
      '@language': ''
    },
    tags: transformTags(tags),
    author,
    license: values.metadata.useRemoteLicense
      ? values.metadata.uploadedLicense
      : license,
    links: convertLinks(linksTransformed),
    additionalInformation: {
      termsAndConditions
    },
    ...(type === 'algorithm' &&
      dockerImage !== '' && {
        algorithm: {
          language: filesTransformed?.length
            ? getUrlFileExtension(filesTransformed[0])
            : '',
          version: '0.1',
          container: {
            entrypoint:
              dockerImage === 'custom'
                ? dockerImageCustomEntrypoint
                : algorithmContainerPresets.entrypoint,
            image:
              dockerImage === 'custom'
                ? dockerImageCustom
                : algorithmContainerPresets.image,
            tag:
              dockerImage === 'custom'
                ? dockerImageCustomTag
                : algorithmContainerPresets.tag,
            checksum:
              dockerImage === 'custom'
                ? dockerImageCustomChecksum
                : algorithmContainerPresets.checksum
          },
          consumerParameters: consumerParametersTransformed
        }
      }),
    copyrightHolder: '',
    providedBy: ''
  }

  const file = {
    nftAddress,
    datatokenAddress,
    files: [normalizeFile(files[0].type, files[0], chainId)]
  }

  const filesEncrypted =
    !isPreview &&
    files?.length &&
    files[0].valid &&
    (await getEncryptedFiles(file, chainId, providerUrl.url))

  const newCredentials = generateCredentials(undefined, allow, deny)

  const newService: Service = {
    id: getHash(datatokenAddress + filesEncrypted),
    type: access,
    files: filesEncrypted || '',
    datatokenAddress,
    serviceEndpoint: providerUrl.url,
    timeout: mapTimeoutStringToSeconds(timeout),
    ...(access === 'compute' && {
      compute: values.services[0].computeOptions
    }),
    consumerParameters: values.services[0].usesConsumerParameters
      ? transformConsumerParameters(values.services[0].consumerParameters)
      : undefined,
    name: '',
    state: asset.stats[0],
    credentials: newCredentials
  }

  const did = nftAddress ? makeDid(nftAddress, chainId.toString()) : '0x...'

  const newDdo: any = {
    '@context': ['https://w3id.org/did/v1'],
    id: did,
    version: DDOVersion.V5_0_0,
    credentialSubject: {
      id: did,
      chainId,
      metadata: newMetadata,
      services: [newService],
      nftAddress,
      credentials: {
        allow: [],
        deny: []
      },
      datatokens: [
        {
          name: values.services[0].dataTokenOptions.name,
          symbol: values.services[0].dataTokenOptions.symbol,
          address: '',
          serviceId: ''
        }
      ]
    },
    additionalDdos: [],
    // Only added for DDO preview, reflecting Asset response,
    // again, we can assume if `datatokenAddress` is not passed,
    // we are on preview.
    nft: {
      ...generateNftCreateData(values?.metadata.nft, accountId),
      address: '',
      state: 0,
      created: ''
    }
  }

  return newDdo
}

export interface IpfsUpload {
  metadataIPFS: string
  flags: number
  metadataIPFSHash: string
}

/**
 * Deviates from JOSE by using the alg: ETH-EIP191 field.
 * Accordingly, a web3 wallet signature is to be used for verification.
 */
async function createJwtVerifiableCredential(
  credential: VCDataModel.Credential,
  owner: Signer
): Promise<`${string}.${string}.${string}`> {
  const header: JWTHeaderParameters = {
    alg: 'ETH-EIP191',
    typ: 'JWT'
  }
  const headerBase64 = base64url(JSON.stringify(header))
  const payload: VCDataModel.VerifiableCredentialJWT = {
    vc: credential,
    iss: credential.issuer,
    sub: credential.id,
    jti: credential.id
  }
  const payloadBase64 = base64url(JSON.stringify(payload))
  const signature = await owner.signMessage(`${headerBase64}.${payloadBase64}`)
  const signatureBase64 = base64url(signature)
  return `${headerBase64}.${payloadBase64}.${signatureBase64}`
}

export async function signAssetAndUploadToIpfs(
  asset: Asset,
  owner: Signer,
  encryptAsset: boolean,
  providerUrl: string
): Promise<IpfsUpload> {
  // TODO: The verifiable credentials standard differentiates between JWT and embedded proof credentials.
  // In embedded proof credentials, our current schema says that the Asset *is* the verifiable credential.
  // However, in the JWT approach, the asset is *within* in the verifiable credential.
  // see https://www.w3.org/TR/vc-data-model/#proofs-signatures

  const credential: VCDataModel.Credential = {
    id: asset.id,
    credentialSubject: asset.credentialSubject,
    issuer: `${await owner.getAddress()}`,
    '@context': asset['@context'],
    version: asset.version,
    type: asset.type
  }

  // these properties are mutable due blockchain interaction
  delete credential.credentialSubject.datatokens
  delete credential.credentialSubject.event

  const jwtVerifiableCredential = await createJwtVerifiableCredential(
    credential,
    owner
  )

  // const validateResult = await aquariusInstance.validate(credential)
  // if (!validateResult.valid) {
  //  throw new Error('Invalid Asset')
  // }

  const stringAsset = JSON.stringify(jwtVerifiableCredential)
  const bytes = Buffer.from(stringAsset)
  const metadata = hexlify(bytes)

  const data = { encryptedData: metadata }
  const ipfsHash = await uploadToIPFS(data)

  const remoteAsset = {
    remote: {
      type: 'ipfs',
      hash: ipfsHash
    }
  }

  let flags: number
  let metadataIPFS: string
  if (encryptAsset) {
    try {
      metadataIPFS = await ProviderInstance.encrypt(
        remoteAsset,
        asset.credentialSubject?.chainId,
        providerUrl
      )
      flags = 2
    } catch (error) {
      LoggerInstance.error('[Provider Encrypt] Error:', error.message)
    }
  } else {
    const stringDDO: string = JSON.stringify(remoteAsset)
    const bytes: Buffer = Buffer.from(stringDDO)
    metadataIPFS = hexlify(bytes)
    flags = 0
  }

  if (!metadataIPFS)
    throw new Error('No encrypted IPFS metadata received. Please try again.')

  const stringDDO = JSON.stringify(data)
  const metadataIPFSHash =
    '0x' + createHash('sha256').update(stringDDO).digest('hex')

  return { metadataIPFS, flags, metadataIPFSHash }
}

export async function createTokensAndPricing(
  values: FormPublishData,
  accountId: string,
  config: Config,
  nftFactory: NftFactory
) {
  const nftCreateData: NftCreateData = generateNftCreateData(
    values.metadata.nft,
    accountId,
    values.metadata.transferable
  )
  LoggerInstance.log('[publish] Creating NFT with metadata', nftCreateData)
  // TODO: cap is hardcoded for now to 1000, this needs to be discussed at some point
  const ercParams: DatatokenCreateParams = {
    templateIndex: defaultDatatokenTemplateIndex,
    minter: accountId,
    paymentCollector: accountId,
    mpFeeAddress: marketFeeAddress,
    feeToken: config.oceanTokenAddress,
    feeAmount: publisherMarketOrderFee,
    // max number
    cap: defaultDatatokenCap,
    name: values.services[0].dataTokenOptions.name,
    symbol: values.services[0].dataTokenOptions.symbol
  }

  LoggerInstance.log('[publish] Creating datatoken with ercParams', ercParams)

  let erc721Address, datatokenAddress, txHash

  switch (values.pricing.type) {
    case 'fixed': {
      const freParams: FreCreationParams = {
        fixedRateAddress: config.fixedRateExchangeAddress,
        baseTokenAddress: process.env.NEXT_PUBLIC_OCEAN_TOKEN_ADDRESS
          ? process.env.NEXT_PUBLIC_OCEAN_TOKEN_ADDRESS
          : values.pricing.baseToken.address,
        owner: accountId,
        marketFeeCollector: marketFeeAddress,
        baseTokenDecimals: process.env.NEXT_PUBLIC_OCEAN_TOKEN_ADDRESS
          ? 18
          : values.pricing.baseToken.decimals,
        datatokenDecimals: 18,
        fixedRate: values.pricing.price.toString(),
        marketFee: publisherMarketFixedSwapFee,
        withMint: true
      }

      LoggerInstance.log(
        '[publish] Creating fixed pricing with freParams',
        freParams
      )

      const result = await nftFactory.createNftWithDatatokenWithFixedRate(
        nftCreateData,
        ercParams,
        freParams
      )

      const trxReceipt = await result.wait()
      const nftCreatedEvent = getEventFromTx(trxReceipt, 'NFTCreated')
      const tokenCreatedEvent = getEventFromTx(trxReceipt, 'TokenCreated')

      erc721Address = nftCreatedEvent.args.newTokenAddress
      datatokenAddress = tokenCreatedEvent.args.newTokenAddress
      txHash = trxReceipt.transactionHash

      LoggerInstance.log('[publish] createNftErcWithFixedRate tx', txHash)

      break
    }
    case 'free': {
      // maxTokens -  how many tokens cand be dispensed when someone requests . If maxTokens=2 then someone can't request 3 in one tx
      // maxBalance - how many dt the user has in it's wallet before the dispenser will not dispense dt
      // both will be just 1 for the market
      const dispenserParams: DispenserCreationParams = {
        dispenserAddress: config.dispenserAddress,
        maxTokens: parseEther('1').toString(),
        maxBalance: parseEther('1').toString(),
        withMint: true,
        allowedSwapper: ZERO_ADDRESS
      }

      LoggerInstance.log(
        '[publish] Creating free pricing with dispenserParams',
        dispenserParams
      )

      const result = await nftFactory.createNftWithDatatokenWithDispenser(
        nftCreateData,
        ercParams,
        dispenserParams
      )
      const trxReceipt = await result.wait()
      const nftCreatedEvent = getEventFromTx(trxReceipt, 'NFTCreated')
      const tokenCreatedEvent = getEventFromTx(trxReceipt, 'TokenCreated')

      erc721Address = nftCreatedEvent.args.newTokenAddress
      datatokenAddress = tokenCreatedEvent.args.newTokenAddress
      txHash = trxReceipt.transactionHash

      LoggerInstance.log('[publish] createNftErcWithDispenser tx', txHash)

      break
    }
  }

  return { erc721Address, datatokenAddress, txHash }
}

export function getFormattedCodeString(parsedCodeBlock: any): string {
  const formattedString = JSON.stringify(parsedCodeBlock, null, 2)
  return `\`\`\`\n${formattedString}\n\`\`\``
}
