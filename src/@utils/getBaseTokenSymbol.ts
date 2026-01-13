import { Asset } from 'src/@types/Asset'

type AssetWithAccess = Asset & { accessDetails?: AccessDetails[] }

export const getBaseTokenSymbol = (
  asset: AssetWithAccess,
  serviceIndex = 0
): string | undefined => {
  const accessDetail = asset.accessDetails?.[serviceIndex]
  if (accessDetail?.baseToken?.symbol) {
    return accessDetail.baseToken.symbol
  }

  const credentialSubjectStats = (asset.credentialSubject as any)?.stats
  if (credentialSubjectStats?.price?.tokenSymbol) {
    return credentialSubjectStats.price.tokenSymbol
  }

  const stats = asset.indexedMetadata?.stats?.[serviceIndex] as
    | { price?: { tokenSymbol?: string } }
    | undefined
  if (stats?.price?.tokenSymbol) {
    return stats.price.tokenSymbol
  }

  return undefined
}
