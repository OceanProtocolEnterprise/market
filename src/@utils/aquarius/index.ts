import { LoggerInstance } from '@oceanprotocol/lib'
import { AssetSelectionAsset } from '@shared/FormInput/InputElement/AssetSelection'
import axios, { CancelToken, AxiosResponse } from 'axios'
import {
  metadataCacheUri,
  allowDynamicPricing,
  nodeUriIndex
} from '../../../app.config.cjs'
import {
  SortDirectionOptions,
  SortTermOptions
} from '../../@types/aquarius/SearchQuery'
import { transformAssetToAssetSelection } from '../assetConverter'
import addressConfig from '../../../address.config.cjs'
import { isValidDid } from '@utils/ddo'
import { Filters } from '@context/Filter'
import { filterSets } from '@components/Search/Filter'
import { Asset } from 'src/@types/Asset'

export interface UserSales {
  id: string
  totalSales: number
}

export const MAXIMUM_NUMBER_OF_PAGES_WITH_RESULTS = 476

export function escapeEsReservedCharacters(value: string): string {
  // eslint-disable-next-line no-useless-escape
  const pattern = /([\!\*\+\-\=\<\>\&\|\(\)\[\]\{\}\^\~\?\:\\/"])/g
  return value?.replace(pattern, '\\$1')
}

/**
 * @param filterField the name of the actual field from the ddo schema e.g. 'id','service.attributes.main.type'
 * @param value the value of the filter
 * @returns json structure of the es filter
 */
type TFilterValue = string | number | boolean | number[] | string[]
type TFilterKey = 'terms' | 'term' | 'match' | 'match_phrase'
export function getFilterTerm(
  filterField: string,
  value: TFilterValue,
  key: TFilterKey = 'term'
): FilterTerm {
  const isArray = Array.isArray(value)
  const useKey = key === 'term' ? (isArray ? 'terms' : 'term') : key
  return {
    [useKey]: {
      [filterField]: value
    }
  }
}

export function getRangeFilterTerm(
  filterField: string,
  gteValue: string
): FilterTerm {
  return {
    range: {
      [filterField]: {
        gte: gteValue
      }
    }
  }
}

export function parseFilters(
  filtersList: Filters,
  filterSets: { [key: string]: string[] }
): FilterTerm[] {
  const filterQueryPath = {
    accessType: 'credentialSubject.services.type',
    serviceType: 'credentialSubject.metadata.type',
    filterSet: 'credentialSubject.metadata.tags.keyword',
    filterTime: 'credentialSubject.metadata.created',
    assetState: 'indexedMetadata.nft.state'
  }
  if (filtersList) {
    const filterTerms = Object.keys(filtersList)?.map((key) => {
      if (key === 'filterSet') {
        const tags = filtersList[key].reduce(
          (acc, set) => [...acc, ...filterSets[set]],
          []
        )
        const uniqueTags = [...new Set(tags)]
        return uniqueTags.length > 0
          ? getFilterTerm(filterQueryPath[key], uniqueTags)
          : undefined
      }
      if (key === 'filterTime' && filtersList[key]?.length > 0) {
        const now = new Date()
        const targetDate = new Date(now.getTime() - Number(filtersList[key][0]))
        const targetDateISOString = targetDate.toISOString()
        return getRangeFilterTerm(filterQueryPath[key], targetDateISOString)
      }
      if (filtersList[key]?.length > 0) {
        return getFilterTerm(filterQueryPath[key], filtersList[key])
      }
      return undefined
    })

    return filterTerms.filter((term) => term !== undefined)
  }
  return []
}

export function getWhitelistShould(): FilterTerm[] {
  const { whitelists } = addressConfig

  const whitelistFilterTerms = Object.entries(whitelists)
    .filter(([field, whitelist]) => whitelist?.length > 0)
    .map(([field, whitelist]) =>
      whitelist.map((address) => getFilterTerm(field, address, 'match'))
    )
    .reduce((prev, cur) => prev.concat(cur), [])

  return whitelistFilterTerms?.length > 0 ? whitelistFilterTerms : []
}

export function getDynamicPricingMustNot(): // eslint-disable-next-line camelcase
FilterTerm | undefined {
  return allowDynamicPricing === 'true'
    ? undefined
    : getFilterTerm('indexedMetadata.stats.prices.type', 'pool')
}

export function generateBaseQuery(
  baseQueryParams: BaseQueryParams,
  index?: string,
  allNode?: boolean
): SearchQuery {
  const generatedQuery = {
    index: index ?? 'op_ddo_v5.0.0',
    from: baseQueryParams.esPaginationOptions?.from || 0,
    size:
      baseQueryParams.esPaginationOptions?.size >= 0
        ? baseQueryParams.esPaginationOptions?.size
        : 1000,
    query: {
      bool: {
        ...baseQueryParams.nestedQuery,
        filter: [
          ...(baseQueryParams.filters || []),
          ...(baseQueryParams.chainIds
            ? [
                getFilterTerm(
                  'credentialSubject.chainId',
                  baseQueryParams.chainIds
                )
              ]
            : []),
          ...(baseQueryParams.ignorePurgatory
            ? []
            : [getFilterTerm('indexedMetadata.purgatory.state', false)]),
          {
            bool: {
              must_not: [
                !baseQueryParams.ignoreState &&
                  getFilterTerm('indexedMetadata.nft.state', 5),
                getDynamicPricingMustNot()
              ]
            }
          },
          ...(!allNode
            ? [
                {
                  terms: {
                    'credentialSubject.services.serviceEndpoint.keyword':
                      nodeUriIndex
                  }
                }
              ]
            : [])
        ]
      }
    }
  } as SearchQuery

  if (baseQueryParams.aggs !== undefined) {
    generatedQuery.aggs = baseQueryParams.aggs
  }

  if (baseQueryParams.sortOptions !== undefined) {
    generatedQuery.sort = {
      [`${baseQueryParams.sortOptions.sortBy}`]:
        baseQueryParams.sortOptions.sortDirection ||
        SortDirectionOptions.Descending
    }
  }

  // add whitelist filtering
  if (getWhitelistShould()?.length > 0) {
    const whitelistQuery = {
      bool: {
        should: [...getWhitelistShould()],
        minimum_should_match: 1
      }
    }
    Object.hasOwn(generatedQuery.query.bool, 'must')
      ? generatedQuery.query.bool.must.push(whitelistQuery)
      : (generatedQuery.query.bool.must = [whitelistQuery])
  }

  return generatedQuery
}

export function transformQueryResult(
  queryResult,
  from = 0,
  size = 21
): PagedAssets {
  const result: PagedAssets = {
    results: [],
    page: 0,
    totalPages: 0,
    totalResults: 0,
    aggregations: {}
  }
  result.results = queryResult.results

  result.totalResults =
    queryResult.totalResults || queryResult.results?.length || 0

  result.totalPages = Math.ceil(result.totalResults / size)
  result.page = from ? from + 1 : 1
  result.aggregations = queryResult.aggregations || {}
  return result
}

export async function queryMetadata(
  query: SearchQuery,
  cancelToken: CancelToken
): Promise<PagedAssets> {
  try {
    const response: AxiosResponse<SearchResponse> = await axios.post(
      `${metadataCacheUri}/api/aquarius/assets/metadata/query`,
      { ...query },
      { cancelToken }
    )
    if (!response || response.status !== 200 || !response.data) return
    const data = response.data[0] || []
    return transformQueryResult(data, query.from, query.size)
  } catch (error) {
    if (axios.isCancel(error)) {
      LoggerInstance.log(error.message)
    } else {
      LoggerInstance.error(error.message)
    }
  }
}

export async function getAsset(
  did: string,
  cancelToken: CancelToken
): Promise<any> {
  try {
    if (!isValidDid(did)) return
    const response: AxiosResponse<any> = await axios.get(
      `${metadataCacheUri}/api/aquarius/assets/ddo/${did}`,
      { cancelToken }
    )
    if (!response || response.status !== 200 || !response.data) return

    const data = { ...response.data }
    return data
  } catch (error) {
    if (axios.isCancel(error)) {
      LoggerInstance.log(error.message)
    } else {
      LoggerInstance.error(error.message)
    }
  }
}

export async function getAssetsFromDids(
  didList: string[],
  chainIds: number[],
  cancelToken: CancelToken
): Promise<Asset[]> {
  if (didList?.length === 0 || chainIds?.length === 0) return []

  try {
    const orderedDDOListByDIDList: Asset[] = []
    const baseQueryparams = {
      chainIds,
      filters: [getFilterTerm('_id', didList)],
      ignorePurgatory: true
    } as BaseQueryParams
    const query = generateBaseQuery(baseQueryparams)
    const result = await queryMetadata(query, cancelToken)

    didList.forEach((did: string) => {
      const ddo = result.results.find((ddo: Asset) => ddo.id === did)
      if (ddo) orderedDDOListByDIDList.push(ddo)
    })
    return orderedDDOListByDIDList
  } catch (error) {
    LoggerInstance.error(error.message)
  }
}

export async function getAlgorithmDatasetsForCompute(
  algorithmId: string,
  serviceId: string,
  datasetProviderUri: string,
  accountId: string,
  datasetChainId?: number,
  cancelToken?: CancelToken
): Promise<AssetSelectionAsset[]> {
  const baseQueryParams = {
    chainIds: [datasetChainId],
    filters: [
      {
        term: {
          'credentialSubject.services.compute.publisherTrustedAlgorithms.did.keyword':
            algorithmId
        }
      },
      {
        term: {
          'credentialSubject.services.compute.publisherTrustedAlgorithms.serviceId.keyword':
            serviceId
        }
      }
    ],
    sortOptions: {
      sortBy: SortTermOptions.Created,
      sortDirection: SortDirectionOptions.Descending
    }
  } as BaseQueryParams

  const baseQueryParams2 = {
    chainIds: [datasetChainId],
    filters: [
      {
        term: {
          'credentialSubject.services.compute.publisherTrustedAlgorithms.did.keyword':
            '*'
        }
      },
      {
        term: {
          'credentialSubject.services.compute.publisherTrustedAlgorithms.serviceId.keyword':
            '*'
        }
      }
    ],
    sortOptions: {
      sortBy: SortTermOptions.Created,
      sortDirection: SortDirectionOptions.Descending
    }
  } as BaseQueryParams

  const baseQueryParams3 = {
    chainIds: [datasetChainId],
    filters: [
      {
        term: {
          'credentialSubject.services.compute.publisherTrustedAlgorithmPublishers.keyword':
            '*'
        }
      }
    ],
    sortOptions: {
      sortBy: SortTermOptions.Created,
      sortDirection: SortDirectionOptions.Descending
    }
  } as BaseQueryParams

  const query = generateBaseQuery(baseQueryParams)
  const query2 = generateBaseQuery(baseQueryParams2)
  const query3 = generateBaseQuery(baseQueryParams3)
  const [res1, res2, res3] = await Promise.all([
    queryMetadata(query, cancelToken),
    queryMetadata(query2, cancelToken),
    queryMetadata(query3, cancelToken)
  ])

  // Combine results and deduplicate by ID
  const combined = [
    ...(res1?.results || []),
    ...(res2?.results || []),
    ...(res3?.results || [])
  ]

  const uniqueAssetsMap = new Map<string, any>()
  combined.forEach((asset) => {
    if (!uniqueAssetsMap.has(asset.id)) {
      uniqueAssetsMap.set(asset.id, asset)
    }
  })

  const uniqueAssets = Array.from(uniqueAssetsMap.values())
  console.log('uniqueAssets', uniqueAssets)
  const datasets = await transformAssetToAssetSelection(
    datasetProviderUri,
    uniqueAssets,
    accountId,
    []
  )
  return datasets
}

export async function getPublishedAssets(
  accountId: string,
  chainIds: number[],
  cancelToken: CancelToken,
  ignorePurgatory = false,
  ignoreState = false,
  filtersList?: Filters,
  page?: number
): Promise<PagedAssets> {
  if (!accountId) return
  const filters: FilterTerm[] = []
  filters.push(
    getFilterTerm('indexedMetadata.nft.owner', accountId.toLowerCase())
  )
  if (filtersList) {
    parseFilters(filtersList, filterSets).forEach((term) => filters.push(term))
  }
  const baseQueryParams = {
    chainIds,
    filters,
    sortOptions: {
      sortBy: SortTermOptions.Created,
      sortDirection: SortDirectionOptions.Descending
    },
    aggs: {
      totalOrders: {
        sum: {
          field: SortTermOptions.Orders
        }
      }
    },
    ignorePurgatory,
    ignoreState,
    esPaginationOptions: {
      from: page || 0,
      size: 9
    }
  } as BaseQueryParams

  const query = generateBaseQuery(baseQueryParams)
  try {
    const result = await queryMetadata(query, cancelToken)
    return result
  } catch (error) {
    if (axios.isCancel(error)) {
      LoggerInstance.log(error.message)
    } else {
      LoggerInstance.error(error.message)
    }
  }
}

async function getTopPublishers(
  chainIds: number[],
  cancelToken: CancelToken,
  page?: number,
  type?: string,
  accesType?: string
): Promise<PagedAssets> {
  const filters: FilterTerm[] = []

  accesType !== undefined &&
    filters.push(getFilterTerm('credentialSubject.services.type', accesType))
  type !== undefined &&
    filters.push(getFilterTerm('credentialSubject.metadata.type', type))

  const baseQueryParams = {
    chainIds,
    filters,
    sortOptions: {
      sortBy: SortTermOptions.Created,
      sortDirection: SortDirectionOptions.Descending
    },
    aggs: {
      topPublishers: {
        terms: {
          field: 'indexedMetadata.nft.owner.keyword',
          order: { totalSales: 'desc' }
        },
        aggs: {
          totalSales: {
            sum: {
              field: SortTermOptions.Orders
            }
          }
        }
      }
    },
    esPaginationOptions: {
      from: page || 0,
      size: 9
    }
  } as BaseQueryParams

  const query = generateBaseQuery(baseQueryParams)

  try {
    const result = await queryMetadata(query, cancelToken)
    return result
  } catch (error) {
    if (axios.isCancel(error)) {
      LoggerInstance.log(error.message)
    } else {
      LoggerInstance.error(error.message)
    }
  }
}

export async function getTopAssetsPublishers(
  chainIds: number[],
  nrItems = 9
): Promise<UserSales[]> {
  const publishers: UserSales[] = []

  const result = await getTopPublishers(chainIds, null)
  const { topPublishers } = result.aggregations

  if (!topPublishers?.buckets) {
    return []
  }

  for (let i = 0; i < topPublishers.buckets?.length; i++) {
    publishers.push({
      id: topPublishers.buckets[i].key,
      totalSales: parseInt(topPublishers.buckets[i].totalSales.value)
    })
  }

  publishers.sort((a, b) => b.totalSales - a.totalSales)

  return publishers.slice(0, nrItems)
}

export async function getUserSalesAndRevenue(
  accountId: string,
  chainIds: number[],
  filter?: Filters
): Promise<{ totalOrders: number; totalRevenue: number; results: Asset[] }> {
  try {
    let page = 1
    let totalOrders = 0
    let totalRevenue = 0
    let assets: PagedAssets
    const allResults: Asset[] = []

    do {
      assets = await getPublishedAssets(
        accountId,
        chainIds,
        null,
        false,
        false,
        filter,
        page
      )
      // TODO stats is not in ddo
      if (assets && assets.results) {
        assets.results.forEach((asset) => {
          const orders = asset?.indexedMetadata?.stats[0]?.orders || 0
          const price =
            Number(asset?.indexedMetadata?.stats?.[0]?.prices?.[0]?.price) || 0
          totalOrders += orders
          totalRevenue += orders * price
        })
        allResults.push(...assets.results)
      }
      page++
    } while (
      assets &&
      assets.results &&
      assets.results?.length > 0 &&
      page <= assets.totalPages
    )

    return { totalOrders, totalRevenue, results: allResults }
  } catch (error) {
    LoggerInstance.error('Error in getUserSales', error.message)
    return { totalOrders: 0, totalRevenue: 0, results: [] }
  }
}

export async function getUserOrders(
  accountId: string,
  cancelToken: CancelToken,
  page?: number,
  filterTerm?: string
): Promise<PagedAssets> {
  const filters: FilterTerm[] = []
  const filterTermKeyword = filterTerm || 'consumer.keyword'
  filters.push(getFilterTerm(filterTermKeyword, accountId))
  const baseQueryparams = {
    filters,
    ignorePurgatory: true,
    esPaginationOptions: {
      from: page || 0,
      size: 1000
    }
  } as BaseQueryParams
  const query = generateBaseQuery(baseQueryparams, 'order', true)
  try {
    return queryMetadata(query, cancelToken)
  } catch (error) {
    if (axios.isCancel(error)) {
      LoggerInstance.log(error.message)
    } else {
      LoggerInstance.error(error.message)
    }
  }
}

export async function getDownloadAssets(
  dtList: string[],
  chainIds: number[],
  cancelToken: CancelToken,
  ignoreState = false,
  page?: number
): Promise<{ downloadedAssets: DownloadedAsset[]; totalResults: number }> {
  const filters: FilterTerm[] = []
  filters.push(
    getFilterTerm('credentialSubject.services.datatokenAddress.keyword', dtList)
  )
  filters.push({
    exists: {
      field: 'indexedMetadata'
    }
  })
  filters.push(getFilterTerm('credentialSubject.services.type', 'access'))
  const baseQueryparams = {
    chainIds,
    filters,
    ignorePurgatory: true,
    ignoreState,
    esPaginationOptions: {
      from: page || 0,
      size: 9
    }
  } as BaseQueryParams
  const query = generateBaseQuery(baseQueryparams)
  try {
    const result = await queryMetadata(query, cancelToken)
    let downloadedAssets: DownloadedAsset[] = []
    if (result) {
      downloadedAssets = result?.results
        ?.map((asset) => {
          const timestampStr =
            asset?.indexedMetadata?.event?.datetime ??
            asset?.indexedMetadata?.nft?.created

          const timestamp = timestampStr
            ? new Date(timestampStr).getTime()
            : Date.now()

          return {
            asset,
            networkId: asset?.credentialSubject?.chainId,
            dtSymbol: asset?.indexedMetadata?.stats[0]?.symbol,
            timestamp
          }
        })
        .sort((a, b) => b.timestamp - a.timestamp)
    }
    return { downloadedAssets, totalResults: result?.totalResults || 0 }
  } catch (error) {
    if (axios.isCancel(error)) {
      LoggerInstance.log(error.message)
    } else {
      LoggerInstance.error(error.message)
    }
  }
}

export async function getTagsList(
  chainIds: number[],
  cancelToken: CancelToken
): Promise<string[]> {
  const baseQueryParams = {
    chainIds,
    esPaginationOptions: { from: 0, size: 0 }
  } as BaseQueryParams
  const query = {
    ...generateBaseQuery(baseQueryParams),
    aggs: {
      tags: {
        terms: {
          field: 'credentialSubject.metadata.tags.keyword',
          size: 1000
        }
      }
    }
  }

  try {
    const response: AxiosResponse<any[]> = await axios.post(
      `${metadataCacheUri}/api/aquarius/assets/metadata/query`,
      { ...query },
      { cancelToken }
    )
    if (response?.status !== 200 || !response?.data) {
      return []
    }
    const tagsSet: Set<string> = new Set()
    response.data.forEach((items) => {
      items.results?.forEach((item) => {
        item.credentialSubject.metadata.tags
          .filter((tag: string) => tag !== '')
          .forEach((tag: string) => tagsSet.add(tag))
      })
    })
    const uniqueTagsList = Array.from(tagsSet).sort()
    return uniqueTagsList
  } catch (error) {
    if (axios.isCancel(error)) {
      LoggerInstance.log(error.message)
    } else {
      LoggerInstance.error(error.message)
    }
  }
}
