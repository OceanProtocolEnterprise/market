import { LoggerInstance } from '@oceanprotocol/lib'
import { Asset } from 'src/@types/Asset'
import { DDOVersion, lastDdoVersion } from 'src/@types/DdoVersion'

function convertFromV4(asset: any): Asset {
  LoggerInstance.log('[convertFromV4] Convert Ddo from V4 to V5')
  LoggerInstance.log('[convertFromV4] old version:', asset)
  const newAsset: Asset = {
    '@context': asset['@context'],
    version: lastDdoVersion(),
    id: asset.id,
    nft: asset.nft,
    purgatory: asset.purgatory,
    stats: asset.stats,
    credentialSubject: {
      id: asset.id,
      chainId: asset.chainId,
      metadata: asset.metadata,
      nftAddress: asset.nftAddress,
      services: asset.services,
      credentials: asset.credentials,
      event: {
        block: asset.event.block,
        contract: asset.event.contract,
        datetime: asset.event.datetime,
        from: asset.event.from,
        txid: asset.event.tx
      },
      datatokens: asset.datatokens
    },
    issuer: '',
    additionalDdos: [],
    type: asset.type,
    proof: undefined
  }
  LoggerInstance.log('[convertFromV4] new version:', newAsset)
  return newAsset
}

function convertToLastDdoVersion(asset: any): Asset {
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
  return newAsset
}

export { convertFromV4, convertToLastDdoVersion }
