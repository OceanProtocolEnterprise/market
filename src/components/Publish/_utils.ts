import {
  Config,
  FreCreationParams,
  generateDid,
  DatatokenCreateParams,
  DispenserCreationParams,
  getHash,
  LoggerInstance,
  NftCreateData,
  NftFactory,
  ZERO_ADDRESS,
  getEventFromTx,
  ConsumerParameter,
  signCredential,
  ProviderInstance,
  Nft,
  Aquarius
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
} from '../../../app.config'
import { sanitizeUrl } from '@utils/url'
import { getContainerChecksum } from '@utils/docker'
import { hexlify, parseEther } from 'ethers/lib/utils'
import { Credentials } from 'src/@types/ddo/Credentials'
import { Asset } from 'src/@types/Asset'
import { Service } from 'src/@types/ddo/Service'
import { Metadata } from 'src/@types/ddo/Metadata'
import { asset } from '.jest/__fixtures__/datasetWithAccessDetails'
import { IssuerKeyJWK } from '@oceanprotocol/lib/dist/types/@types/IssuerSignature'
import { createHash } from 'crypto'
import { ethers, Signer } from 'ethers'
import { uploadToIPFS } from '@utils/ipfs'

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
): ConsumerParameter[] {
  if (!parameters?.length) return

  const transformedValues = parameters.map((param) => {
    const options =
      param.type === 'select'
        ? // Transform from { key: string, value: string } into { key: value }
          JSON.stringify(
            param.options?.map((opt) => ({ [opt.key]: opt.value }))
          )
        : undefined

    const required = param.required === 'required'

    return {
      ...param,
      options,
      required,
      default: param.default.toString()
    }
  })

  return transformedValues as ConsumerParameter[]
}

export function generateCredentials(
  oldCredentials: Credentials | undefined,
  updatedAllow: string[],
  updatedDeny: string[]
): Credentials {
  const updatedCredentials = {
    allow: oldCredentials?.allow || [],
    deny: oldCredentials?.deny || []
  }

  const credentialTypes = [
    { type: 'allow', values: updatedAllow },
    { type: 'deny', values: updatedDeny }
  ]

  credentialTypes.forEach((credentialType) => {
    updatedCredentials[credentialType.type] = [
      ...updatedCredentials[credentialType.type].filter(
        (credential) => credential?.type !== 'address'
      ),
      ...(credentialType.values.length > 0
        ? [{ type: 'address', values: credentialType.values }]
        : [])
    ]
  })

  return updatedCredentials
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

  const did = nftAddress ? generateDid(nftAddress, chainId) : '0x...'
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

  const newMetadata: Metadata = {
    created: currentTime,
    updated: currentTime,
    type,
    name,
    description,
    tags: transformTags(tags),
    author,
    license:
      values.metadata.license || 'https://market.oceanprotocol.com/terms',
    links: linksTransformed,
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
      })
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
      : undefined
  }

  const newCredentials = generateCredentials(undefined, allow, deny)

  const newDdo: any = {
    '@context': ['https://w3id.org/did/v1'],
    id: did,
    version: '5.0.0',
    credentialSubject: {
      id: did,
      chainId,
      metadata: newMetadata,
      services: [newService],
      nftAddress,
      credentials: newCredentials
    },
    datatokens: [
      {
        name: values.services[0].dataTokenOptions.name,
        symbol: values.services[0].dataTokenOptions.symbol,
        address: '',
        serviceId: ''
      }
    ],
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
    //    event: undefined,
    //    stats: undefined,
    //    purgatory: undefined,
    //    issuer: undefined
  }

  return newDdo
}

export async function signAndAndUploadToIpfs(
  asset: Asset,
  owner: Signer,
  nft: Nft,
  encryptAsset: boolean,
  providerUrl: string,
  chainId: number,
  issuerKeyJWK: IssuerKeyJWK,
  publicKeyHex: string,
  aquariusInstance: Aquarius
) {
  const proof = await signCredential(asset, issuerKeyJWK, publicKeyHex)
  asset.issuer = proof.issuer

  console.log(proof)

  const jwsAsset = {
    header: proof.header,
    payload: asset,
    signature: proof.jws
  }

  // ToDo: aquariusInstance.validate just takes an DDO type and not an Asset type
  // const validateResult = await aquariusInstance.validate(asset)
  // if (!validateResult.valid) {
  //  throw new Error('Invalid ddo')
  // }

  const stringMetadata = JSON.stringify(jwsAsset)
  const bytesAsset = Buffer.from(stringMetadata)
  const assetMetadata = hexlify(bytesAsset)

  const data = { encryptedData: assetMetadata }
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
        chainId,
        providerUrl
      )
      flags = 2
    } catch (error) {
      LoggerInstance.error('[Provider Encrypt] Error:', error.message)
    }
  } else {
    const stringDDO = JSON.stringify(remoteAsset)
    const bytes = Buffer.from(stringDDO)
    metadataIPFS = hexlify(bytes)
    flags = 0
  }

  if (!metadataIPFS)
    throw new Error('No encrypted IPFS metadata received. Please try again.')

  const stringDDO = JSON.stringify(data)
  const metadataIPFSHash =
    '0x' + createHash('sha256').update(stringDDO).digest('hex')

  // Set metadata for the NFT
  try {
    await nft.setMetadata(
      asset.credentialSubject?.nftAddress,
      await owner.getAddress(),
      0,
      providerUrl,
      '',
      ethers.utils.hexlify(flags),
      metadataIPFS,
      metadataIPFSHash
    )
  } catch (error) {
    console.log('error:', error)
    throw new Error(error)
  }
  console.log('Version 5.0.0 Asset published. ID:', asset.credentialSubject.id)
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
    feeToken:
      process.env.NEXT_PUBLIC_OCEAN_TOKEN_ADDRESS ||
      values.pricing.baseToken.address,
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
