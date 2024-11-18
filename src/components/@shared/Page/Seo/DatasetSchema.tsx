import { useAsset } from '@context/Asset'
import { useMarketMetadata } from '@context/MarketMetadata'
import useNetworkMetadata, {
  filterNetworksByType
} from '@hooks/useNetworkMetadata'
import removeMarkdown from 'remove-markdown'

const DatasetSchema = (): object => {
  const { asset, isInPurgatory } = useAsset()
  const { networksList } = useNetworkMetadata()
  const { appConfig } = useMarketMetadata()

  const networksMain = filterNetworksByType(
    'mainnet',
    appConfig.chainIdsSupported,
    networksList
  )

  // only show schema on main nets
  const isMainNetwork = networksMain.includes(asset?.credentialSubject?.chainId)

  const isDataset = asset?.credentialSubject?.metadata?.type === 'dataset'

  if (!asset || !isMainNetwork || !isDataset || isInPurgatory) return null

  let isDownloadable = false
  if (
    asset?.credentialSubject?.services &&
    Array.isArray(asset?.credentialSubject?.services)
  ) {
    for (const service of asset.credentialSubject.services) {
      if (service?.type === 'access') {
        isDownloadable = true
        break
      }
    }
  }

  let description = ''
  if (typeof asset?.credentialSubject?.metadata?.description === 'string') {
    description = asset?.credentialSubject?.metadata?.description?.substring(
      0,
      5000
    )
  } else if (
    typeof asset?.credentialSubject?.metadata?.description === 'object'
  ) {
    description = asset?.credentialSubject?.metadata?.description?.[
      '@value'
    ]?.substring(0, 5000)
  }

  // https://developers.google.com/search/docs/advanced/structured-data/dataset
  const datasetSchema = {
    '@context': 'https://schema.org/',
    '@type': 'Dataset',
    name: asset?.credentialSubject?.metadata?.name,
    description: removeMarkdown(description),
    keywords: asset?.credentialSubject?.metadata?.tags,
    datePublished: asset?.credentialSubject?.metadata?.created,
    dateModified: asset?.credentialSubject?.metadata?.updated,
    license: asset?.credentialSubject?.metadata?.license,
    ...(asset?.accessDetails?.at[0]?.type === 'free'
      ? { isAccessibleForFree: true }
      : {
          isAccessibleForFree: false,
          paymentAccepted: 'Cryptocurrency',
          currenciesAccepted: asset?.accessDetails?.at[0]?.baseToken?.symbol,
          offers: {
            '@type': 'Offer',
            price: asset?.accessDetails?.at[0]?.price,
            priceCurrency: asset?.accessDetails?.at[0]?.baseToken?.symbol
          }
        }),
    creator: {
      '@type': 'Organization',
      name: asset?.credentialSubject?.metadata?.author
    },
    ...(isDownloadable && {
      distribution: [
        {
          '@type': 'DataDownload',
          encodingFormat: ''
        }
      ]
    })
  }

  return datasetSchema
}

export { DatasetSchema }
