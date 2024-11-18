import { PublisherTrustedAlgorithm, Asset, Service } from '@oceanprotocol/lib'
import { AssetSelectionAsset } from '@shared/FormInput/InputElement/AssetSelection'
import { getServiceByName, isAddressWhitelisted } from './ddo'
import normalizeUrl from 'normalize-url'
import { getAccessDetails, getAvailablePrice } from './accessDetailsAndPricing'

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
        asset.services.map((service: Service) =>
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
