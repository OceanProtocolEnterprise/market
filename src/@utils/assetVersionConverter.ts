import { Asset } from '@oceanprotocol/lib'
import { DDOVersion } from 'src/@types/DdoVersion'

function convertFromV4(asset: Asset): Asset {
  let newAsset: Asset

  return newAsset
}

function convertToLastDdoVersion(asset: Asset): Asset {
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
