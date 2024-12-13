import { PublisherTrustedAlgorithm, LoggerInstance } from '@oceanprotocol/lib'
import { AssetSelectionAsset } from '@shared/FormInput/InputElement/AssetSelection'
import { getServiceByName, isAddressWhitelisted } from './ddo'
import normalizeUrl from 'normalize-url'
import { getAccessDetails, getAvailablePrice } from './accessDetailsAndPricing'
import { Asset } from 'src/@types/Asset'
import { Service } from 'src/@types/ddo/Service'
import { DDOVersion, lastDdoVersion } from 'src/@types/DdoVersion'

export async function transformAssetToAssetSelection(
  datasetProviderEndpoint: string,
  assets: Asset[],
  accountId: string,
  selectedAlgorithms?: PublisherTrustedAlgorithm[]
): Promise<AssetSelectionAsset[]> {
  const algorithmList: AssetSelectionAsset[] = []
  if (!assets) return []
  for (const asset of assets) {
    const algoService =
      getServiceByName(asset, 'compute') || getServiceByName(asset, 'access')

    if (
      asset?.stats?.price?.value >= 0 &&
      normalizeUrl(algoService?.serviceEndpoint) ===
        normalizeUrl(datasetProviderEndpoint)
    ) {
      let selected = false
      selectedAlgorithms?.forEach((algorithm: PublisherTrustedAlgorithm) => {
        if (algorithm.did === asset.credentialSubject?.id) {
          selected = true
        }
      })

      const accessDetails = await Promise.all(
        asset.credentialSubject?.services.map((service: Service) =>
          getAccessDetails(asset.credentialSubject?.chainId, service)
        )
      )
      const price = getAvailablePrice(accessDetails[0])
      const algorithmAsset: AssetSelectionAsset = {
        did: asset.credentialSubject?.id,
        name: asset.credentialSubject?.metadata.name,
        price: price.value,
        tokenSymbol: price.tokenSymbol,
        checked: selected,
        symbol: asset.credentialSubject?.datatokens[0].symbol,
        isAccountIdWhitelisted: isAddressWhitelisted(asset, accountId)
      }
      selected
        ? algorithmList.unshift(algorithmAsset)
        : algorithmList.push(algorithmAsset)
    }
  }
  return algorithmList
}

function convertFromV4(asset: any): Asset {
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

  LoggerInstance.log('[convertFromV4] Convert Ddo from V4 to V5')
  LoggerInstance.log('[convertFromV4] old version:', asset)
  LoggerInstance.log('[convertFromV4] new version:', newAsset)

  return newAsset
}

function convertToLatestDdoVersion(asset: any): Asset {
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
      throw new Error(
        '[convertToLatestDdoVersion] Unsupported asset type or version number'
      )
  }
  return newAsset
}

export { convertFromV4, convertToLatestDdoVersion }
