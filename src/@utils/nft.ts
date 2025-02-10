import {
  LoggerInstance,
  getHash,
  Nft,
  ProviderInstance,
  MetadataAndTokenURI,
  NftCreateData,
  getErrorMessage
} from '@oceanprotocol/lib'
import { SvgWaves } from './SvgWaves'
import { customProviderUrl } from '../../app.config'
import { Signer, ethers } from 'ethers'
import { toast } from 'react-toastify'
import { Asset } from 'src/@types/Asset'

// https://docs.opensea.io/docs/metadata-standards
export interface NftMetadata {
  name: string
  symbol: string
  description: string
  image?: string
  /* eslint-disable camelcase */
  external_url?: string
  image_data?: string
  background_color?: string
  /* eslint-enable camelcase */
}

function encodeSvg(svgString: string): string {
  return svgString
    .replace(
      '<svg',
      ~svgString.indexOf('xmlns')
        ? '<svg'
        : '<svg xmlns="http://www.w3.org/2000/svg"'
    )
    .replace('></path>', '/>')
    .replace(/"/g, "'")
    .replace(/%/g, '%25')
    .replace(/#/g, '%23')
    .replace(/{/g, '%7B')
    .replace(/}/g, '%7D')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')
    .replace(/\s+/g, ' ')
}

const nftMetadataTemplate = {
  name: 'Data NFT',
  symbol: 'OEC-NFT',
  description: `This NFT represents an asset in Ocean Protocol v4 ecosystems.`,
  external_url: 'https://enterprise.oceanprotocol.com'
}

export function generateNftMetadata(): NftMetadata {
  const waves = new SvgWaves()
  const svg = waves.generateSvg()
  const imageData = `data:image/svg+xml,${encodeSvg(svg.outerHTML)}`

  const newNft: NftMetadata = {
    ...nftMetadataTemplate,
    background_color: '141414', // dark background
    image_data: imageData
  }

  return newNft
}

const tokenUriPrefix = 'data:application/json;base64,'

export function generateNftCreateData(
  nftMetadata: NftMetadata,
  accountId: string,
  transferable = true
): NftCreateData {
  const nftCreateData: NftCreateData = {
    name: nftMetadata.name,
    symbol: nftMetadata.symbol,
    templateIndex: 1,
    tokenURI: '',
    transferable,
    owner: accountId
  }

  return nftCreateData
}

export function decodeTokenURI(tokenURI: string): NftMetadata {
  if (!tokenURI) return undefined

  try {
    const nftMeta = tokenURI.includes('data:application/json')
      ? (JSON.parse(
          Buffer.from(tokenURI.replace(tokenUriPrefix, ''), 'base64').toString()
        ) as NftMetadata)
      : ({ image: tokenURI } as NftMetadata)

    return nftMeta
  } catch (error) {
    LoggerInstance.error(`[NFT] ${error.message}`)
  }
}

export async function setNftMetadata(
  asset: Asset,
  accountId: string,
  signer: Signer,
  signal: AbortSignal
): Promise<ethers.providers.TransactionResponse> {
  let encryptedDdo
  try {
    encryptedDdo = await ProviderInstance.encrypt(
      asset,
      asset.credentialSubject?.chainId,
      customProviderUrl || asset.credentialSubject?.services[0].serviceEndpoint,
      signal
    )
  } catch (err) {
    const message = getErrorMessage(err.message)
    LoggerInstance.error('[Encrypt Data] Error:', message)
    toast.error(message)
  }
  LoggerInstance.log('[setNftMetadata] Got encrypted DDO', encryptedDdo)

  const metadataHash = getHash(JSON.stringify(asset))
  const nft = new Nft(signer)

  // theoretically used by aquarius or provider, not implemented yet, will remain hardcoded
  const flags = ethers.utils.hexlify(2)

  const setMetadataTx = await nft.setMetadata(
    asset.credentialSubject.nftAddress,
    accountId,
    0,
    asset.credentialSubject?.services[0].serviceEndpoint,
    '',
    flags,
    encryptedDdo,
    '0x' + metadataHash
  )

  return setMetadataTx
}

export async function setNFTMetadataAndTokenURI(
  asset: Asset,
  accountId: string,
  signer: Signer,
  nftMetadata: NftMetadata | undefined,
  signal: AbortSignal
): Promise<ethers.providers.TransactionResponse> {
  let encryptedDdo
  try {
    encryptedDdo = await ProviderInstance.encrypt(
      asset,
      asset.credentialSubject?.chainId,
      customProviderUrl || asset.credentialSubject?.services[0].serviceEndpoint,
      signal
    )
  } catch (err) {
    const message = getErrorMessage(err.message)
    LoggerInstance.error('[Encrypt Data] Error:', message)
    toast.error(message)
  }
  LoggerInstance.log(
    '[setNFTMetadataAndTokenURI] Got encrypted DDO',
    encryptedDdo
  )

  const metadataHash = getHash(JSON.stringify(asset))

  // add final did to external_url and asset link to description in nftMetadata before encoding
  const externalUrl = `${
    nftMetadata?.external_url || nftMetadataTemplate.external_url
  }/asset/${asset.credentialSubject?.id}`
  //  TODO: restore to old structure where nftMetadata is always provided
  const encodedMetadata = Buffer.from(
    JSON.stringify(
      nftMetadata
        ? {
            ...nftMetadata,
            description: `${nftMetadata.description}`,
            external_url: externalUrl
          }
        : {
            name: (asset as Asset).nft.name,
            symbol: (asset as Asset).nft.symbol,
            description: `${nftMetadataTemplate.description}\n\nView on Ocean Enterprise: ${externalUrl}`,
            external_url: externalUrl
          }
    )
  ).toString('base64')
  const nft = new Nft(signer, asset.credentialSubject.chainId)

  // theoretically used by aquarius or provider, not implemented yet, will remain hardcoded
  const flags = '0x02'

  const metadataAndTokenURI: MetadataAndTokenURI = {
    metaDataState: 0,
    metaDataDecryptorUrl: asset.credentialSubject?.services[0].serviceEndpoint,
    metaDataDecryptorAddress: '',
    flags,
    data: encryptedDdo,
    metaDataHash: '0x' + metadataHash,
    tokenId: 1,
    tokenURI: `data:application/json;base64,${encodedMetadata}`,
    metadataProofs: []
  }

  const setMetadataAndTokenURITx = await nft.setMetadataAndTokenURI(
    asset.credentialSubject?.nftAddress,
    accountId,
    metadataAndTokenURI
  )

  return setMetadataAndTokenURITx
}
