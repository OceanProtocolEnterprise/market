import { Asset } from 'src/@types/Asset'
import { DDOVersion } from 'src/@types/DdoVersion'

function convertFromV4(asset: any): Asset {
  const newAsset: Asset = {
    '@context': asset['@context'],
    version: DDOVersion.V5_0_0,
    id: asset.id,
    nft: asset.nft,
    datatokens: asset.datatokens,
    purgatory: asset.purgatory,
    stats: asset.stats,
    credentialSubject: {
      id: asset.id,
      chainId: asset.chainId,
      metadata: asset.metadata,
      nftAddress: asset.nftAddress,
      services: asset.services,
      credentials: asset.credentials,
      event: undefined
    },
    issuer: '',
    additionalDdos: [],
    event: asset.event
  }
  return newAsset
}

function convertToLastDdoVersion(asset: any): Asset {
  console.log(asset)
  let newAsset: Asset
  switch (asset?.version) {
    case DDOVersion.V4_1_0:
    case DDOVersion.V4_3_0:
    case DDOVersion.V4_5_0:
      newAsset = convertFromV4(asset)
      break

    case DDOVersion.V5_0_0:
      newAsset = asset
      break

    default:
      console.error('Unsupported asset type or version')
  }
  console.log(newAsset)
  return newAsset
}

export { convertFromV4, convertToLastDdoVersion }
