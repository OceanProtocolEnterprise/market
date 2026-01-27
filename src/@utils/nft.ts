import { LoggerInstance, NftCreateData } from '@oceanprotocol/lib'
import { SvgWaves } from './SvgWaves'

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
  description: `This NFT represents an asset in Ocean Enterprise ecosystems.`,
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
  } catch (error: any) {
    LoggerInstance.error(`[NFT] ${error.message}`)
  }
}
