import { LoggerInstance } from '@oceanprotocol/lib'
import { AssetSelectionAsset } from '@shared/FormInput/InputElement/AssetSelection'
import axios, { CancelToken, AxiosResponse } from 'axios'
import {
  metadataCacheUri,
  allowDynamicPricing,
  nodeUriIndex,
  dataspace
} from '../../../app.config.cjs'
import {
  SortDirectionOptions,
  SortTermOptions
} from '../../@types/aquarius/SearchQuery'
import {
  transformAssetToAssetSelection,
  transformAssetToAssetSelectionDataset
} from '../assetConverter'
import addressConfig from '../../../address.config.cjs'
import { isValidDid } from '@utils/ddo'
import { Filters } from '@context/Filter'
import { filterSets } from '@components/Search/Filter'
import { Asset } from 'src/@types/Asset'
import { resolveServiceTokenSymbol } from '@utils/priceToken'

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

function getRangeFilterTerm(filterField: string, gteValue: string): FilterTerm {
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
    assetState: 'indexedMetadata.nft.state',
    nodeUriIndex: 'credentialSubject.services.serviceEndpoint.keyword'
  }
  if (filtersList) {
    const filterTerms = Object.keys(filtersList)?.map((key) => {
      if (!filterQueryPath[key]) {
        return undefined
      }
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

function getSupportedBlockchainChainIds(filtersList?: Filters): number[] {
  const selectedBlockchainIds = filtersList?.supportedBlockchain || []

  return selectedBlockchainIds
    .map((chainId) => Number(chainId))
    .filter((chainId) => Number.isFinite(chainId))
}

export function getWhitelistShould(): FilterTerm[] {
  const { whitelists } = addressConfig

  const whitelistFilterTerms = Object.entries(whitelists)
    .filter(([, whitelist]) => whitelist?.length > 0)
    .map(([field, whitelist]) =>
      whitelist.map((address) => getFilterTerm(field, address, 'match'))
    )
    .reduce((prev, cur) => prev.concat(cur), [])

  return whitelistFilterTerms?.length > 0 ? whitelistFilterTerms : []
}

function getDynamicPricingMustNot(): // eslint-disable-next-line camelcase
FilterTerm | undefined {
  return allowDynamicPricing === 'true'
    ? undefined
    : getFilterTerm('indexedMetadata.stats.prices.type', 'pool')
}

function getDataspaceFilterTerm(): FilterTerm | undefined {
  if (!dataspace) return undefined
  return getFilterTerm('credentialSubject.dataspace.keyword', dataspace)
}

function hasServiceEndpointFilter(filters?: FilterTerm[]): boolean {
  return (
    filters?.some((filter) =>
      JSON.stringify(filter).includes(
        'credentialSubject.services.serviceEndpoint.keyword'
      )
    ) || false
  )
}

export function generateBaseQuery(
  baseQueryParams: BaseQueryParams,
  index?: string,
  allNode?: boolean
): SearchQuery {
  const dataspaceFilterTerm = getDataspaceFilterTerm()
  const shouldApplyDefaultNodeFilter =
    !allNode && !hasServiceEndpointFilter(baseQueryParams.filters)
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
          ...(shouldApplyDefaultNodeFilter
            ? [
                {
                  terms: {
                    'credentialSubject.services.serviceEndpoint.keyword':
                      nodeUriIndex
                  }
                }
              ]
            : []),
          ...(dataspaceFilterTerm ? [dataspaceFilterTerm] : [])
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

function transformQueryResult(queryResult, from = 0, size = 21): PagedAssets {
  const parsedFrom = Number(from)
  const parsedSize = Number(size)
  const normalizedFrom =
    Number.isFinite(parsedFrom) && parsedFrom > 0 ? parsedFrom : 0
  const normalizedSize =
    Number.isFinite(parsedSize) && parsedSize > 0 ? parsedSize : 21

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

  result.totalPages = Math.ceil(result.totalResults / normalizedSize)
  result.page = normalizedFrom + 1
  result.aggregations = queryResult.aggregations || {}
  return result
}

function getMetadataCacheUris(): string[] {
  return (
    Array.isArray(metadataCacheUri) ? metadataCacheUri : [metadataCacheUri]
  )
    .filter((uri) => typeof uri === 'string')
    .map((uri: string) => uri.trim().replace(/\/+$/, ''))
    .filter(Boolean)
}

interface AquariusQueryResult {
  results?: Asset[]
  totalResults?: number
  aggregations?: unknown
}

interface MetadataCacheQuery {
  cacheUri: string
  query: SearchQuery
}

const serviceEndpointFilterPath =
  'credentialSubject.services.serviceEndpoint.keyword'

function getSearchFilters(query: SearchQuery): unknown[] {
  return Array.isArray(query?.query?.bool?.filter)
    ? query.query.bool.filter
    : []
}

function getServiceEndpointFilterValue(filter: unknown): unknown {
  const typedFilter = filter as {
    terms?: Record<string, unknown>
    term?: Record<string, unknown>
  }

  return (
    typedFilter?.terms?.[serviceEndpointFilterPath] ||
    typedFilter?.term?.[serviceEndpointFilterPath]
  )
}

function getServiceEndpointFilterValues(query: SearchQuery): string[] {
  const filters = getSearchFilters(query)
  const values = filters
    .map((filter) => {
      const filterValue = getServiceEndpointFilterValue(filter)

      return Array.isArray(filterValue) ? filterValue : [filterValue]
    })
    .reduce((previous, current) => previous.concat(current), [])
    .filter((value): value is string => typeof value === 'string')

  return [...new Set(values)]
}

function replaceServiceEndpointFilter(
  query: SearchQuery,
  serviceEndpoint: string
): SearchQuery {
  return {
    ...query,
    query: {
      ...query.query,
      bool: {
        ...query.query.bool,
        filter: getSearchFilters(query).map((filter) => {
          if (getServiceEndpointFilterValue(filter)) {
            return getFilterTerm(serviceEndpointFilterPath, [serviceEndpoint])
          }

          return filter
        })
      }
    }
  }
}

function getMergedQueryFetchSize(query: SearchQuery): number {
  const parsedFrom = Number(query.from)
  const parsedSize = Number(query.size)
  const page = Number.isFinite(parsedFrom) && parsedFrom > 0 ? parsedFrom : 1
  const size = Number.isFinite(parsedSize) && parsedSize > 0 ? parsedSize : 21

  return page * size
}

function prepareMergedCacheQuery(query: SearchQuery): SearchQuery {
  return {
    ...query,
    from: 1,
    size: getMergedQueryFetchSize(query)
  }
}

function buildMetadataCacheQueries(
  cacheUris: string[],
  query: SearchQuery
): MetadataCacheQuery[] {
  const serviceEndpoints = getServiceEndpointFilterValues(query).map(
    (serviceEndpoint) => serviceEndpoint.replace(/\/+$/, '')
  )

  if (serviceEndpoints.length === 0) {
    return cacheUris.map((cacheUri) => ({ cacheUri, query }))
  }

  const matchingCacheUris = cacheUris.filter((cacheUri) =>
    serviceEndpoints.includes(cacheUri)
  )

  if (matchingCacheUris.length === 1) {
    const [cacheUri] = matchingCacheUris

    return [
      {
        cacheUri,
        query: replaceServiceEndpointFilter(query, cacheUri)
      }
    ]
  }

  const cacheQueries = matchingCacheUris.map((cacheUri) => ({
    cacheUri,
    query: replaceServiceEndpointFilter(
      prepareMergedCacheQuery(query),
      cacheUri
    )
  }))

  return cacheQueries.length > 0
    ? cacheQueries
    : cacheUris.map((cacheUri) => ({
        cacheUri,
        query: prepareMergedCacheQuery(query)
      }))
}

function getQueryResult(
  responseData: unknown
): AquariusQueryResult | undefined {
  const queryResult = Array.isArray(responseData)
    ? responseData[0]
    : responseData

  return queryResult && typeof queryResult === 'object'
    ? (queryResult as AquariusQueryResult)
    : undefined
}

function getSortValue(asset: Asset, path: string): string | number | undefined {
  const value = path
    .replace(/\.keyword$/, '')
    .split('.')
    .reduce<unknown>((result, key) => {
      if (!result || typeof result !== 'object') return undefined
      return (result as Record<string, unknown>)[key]
    }, asset)
  const sortableValue = Array.isArray(value) ? value[0] : value

  return typeof sortableValue === 'string' || typeof sortableValue === 'number'
    ? sortableValue
    : undefined
}

function sortMergedResults(
  results: Asset[],
  sort?: SearchQuery['sort']
): Asset[] {
  if (!sort) return results

  const [sortPath, sortDirection] = Object.entries(sort)[0] || []
  if (!sortPath) return results

  return [...results].sort((a, b) => {
    const aValue = getSortValue(a, sortPath)
    const bValue = getSortValue(b, sortPath)

    if (aValue === bValue) return 0
    if (typeof aValue === 'undefined') return 1
    if (typeof bValue === 'undefined') return -1

    const comparison =
      typeof aValue === 'number' && typeof bValue === 'number'
        ? aValue - bValue
        : String(aValue).localeCompare(String(bValue))

    return sortDirection === SortDirectionOptions.Ascending
      ? comparison
      : -comparison
  })
}

function transformMergedQueryResults(
  queryResults: AquariusQueryResult[],
  query: SearchQuery
): PagedAssets {
  const parsedFrom = Number(query.from)
  const parsedSize = Number(query.size)
  const from = Number.isFinite(parsedFrom) && parsedFrom > 0 ? parsedFrom : 0
  const size = Number.isFinite(parsedSize) && parsedSize > 0 ? parsedSize : 21
  const requestedPage = from > 0 ? from : 1
  const pageStart = (requestedPage - 1) * size
  const pageEnd = pageStart + size
  const uniqueResults = new Map<string, Asset>()

  queryResults.forEach((queryResult) => {
    queryResult?.results?.forEach((asset: Asset, index: number) => {
      uniqueResults.set(asset?.id || `${uniqueResults.size}-${index}`, asset)
    })
  })

  const results = sortMergedResults(
    Array.from(uniqueResults.values()),
    query.sort
  )
  const rawResultsCount = queryResults.reduce(
    (sum, queryResult) => sum + (queryResult?.results?.length || 0),
    0
  )
  const reportedTotalResults = queryResults.reduce(
    (sum, queryResult) =>
      sum + (queryResult?.totalResults || queryResult?.results?.length || 0),
    0
  )
  const totalResults =
    rawResultsCount > results.length && results.length < size
      ? (requestedPage - 1) * size + results.length
      : reportedTotalResults

  return {
    results: results.slice(pageStart, pageEnd),
    page: from + 1,
    totalPages: Math.ceil(totalResults / size),
    totalResults,
    aggregations: queryResults[0]?.aggregations || {}
  }
}

async function postMetadataQuery(
  cacheUri: string,
  query: SearchQuery,
  cancelToken: CancelToken
): Promise<AquariusQueryResult | undefined> {
  try {
    const response: AxiosResponse<unknown> = await axios.post(
      `${cacheUri}/api/aquarius/assets/metadata/query`,
      { ...query },
      { cancelToken }
    )
    if (!response || response.status !== 200 || !response.data) return

    return getQueryResult(response.data)
  } catch (error) {
    if (axios.isCancel(error)) {
      LoggerInstance.log(error.message)
    } else {
      LoggerInstance.error(
        `Metadata cache query failed for ${cacheUri}: ${error.message}`
      )
    }
  }
}

export async function queryMetadata(
  query: SearchQuery,
  cancelToken: CancelToken
): Promise<PagedAssets> {
  const cacheUris = getMetadataCacheUris()
  if (cacheUris.length === 0) return
  const cacheQueries = buildMetadataCacheQueries(cacheUris, query)
  const queryResults = (
    await Promise.all(
      cacheQueries.map(({ cacheUri, query }) =>
        postMetadataQuery(cacheUri, query, cancelToken)
      )
    )
  ).filter((queryResult): queryResult is AquariusQueryResult =>
    Boolean(queryResult)
  )

  if (queryResults.length === 0) return

  return cacheQueries.length === 1
    ? transformQueryResult(queryResults[0], query.from, query.size)
    : transformMergedQueryResults(queryResults, query)
}

export async function getAsset(
  did: string,
  cancelToken: CancelToken
): Promise<any> {
  try {
    if (!isValidDid(did)) return
    const cacheUris = getMetadataCacheUris()
    const responses = await Promise.all(
      cacheUris.map(async (cacheUri) => {
        try {
          const response: AxiosResponse<any> = await axios.get(
            `${cacheUri}/api/aquarius/assets/ddo/${did}`,
            { cancelToken }
          )
          return response?.status === 200 && response?.data
            ? response.data
            : undefined
        } catch (error) {
          if (axios.isCancel(error)) {
            LoggerInstance.log(error.message)
          } else {
            LoggerInstance.error(
              `Metadata cache asset lookup failed for ${cacheUri}: ${error.message}`
            )
          }
        }
      })
    )
    const responseData = responses.find(Boolean)
    if (!responseData) return

    const data = { ...responseData }
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
  cancelToken?: CancelToken,
  tokenSymbolMap?: Record<string, string>
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

  const datasetsOnly = combined.filter(
    (asset) => asset?.credentialSubject?.metadata?.type === 'dataset'
  )

  const uniqueAssetsMap = new Map<string, any>()
  datasetsOnly.forEach((asset) => {
    if (!uniqueAssetsMap.has(asset.id)) {
      uniqueAssetsMap.set(asset.id, asset)
    }
  })
  const uniqueAssets = Array.from(uniqueAssetsMap.values())
  const datasets = await transformAssetToAssetSelection(
    datasetProviderUri,
    uniqueAssets,
    accountId,
    [],
    undefined,
    tokenSymbolMap
  )
  return datasets
}

function isAccountAllowed(ddo: any, accountId: string): boolean {
  const checkAllowList = (allowList: any[]): boolean => {
    // If not present or is empty, treat as unrestricted
    if (!allowList || allowList.length === 0) return true
    return allowList.some((allowEntry) => {
      if (allowEntry.type !== 'address' || !allowEntry.values) return false
      return allowEntry.values.some(
        (val) =>
          val.address === '*' ||
          val.address.toLowerCase() === accountId.toLowerCase()
      )
    })
  }

  const checkDenyList = (denyList: any[]): boolean => {
    if (!denyList || denyList.length === 0) return false
    return denyList.some((denyEntry) => {
      if (denyEntry.type !== 'address' || !denyEntry.values) return false
      return denyEntry.values.some(
        (val) =>
          val.address === '*' ||
          val.address.toLowerCase() === accountId.toLowerCase()
      )
    })
  }

  // Root credentials allow/deny
  if (ddo.credentials?.allow && !checkAllowList(ddo.credentials.allow)) {
    return false
  }
  if (ddo.credentials?.deny && checkDenyList(ddo.credentials.deny)) {
    return false
  }

  // Service level allow/deny: pass if undefined or empty
  const services = ddo.credentialSubject?.services || []
  const rootAllowsAllAddresses =
    Array.isArray(ddo.credentials?.allow) &&
    ddo.credentials.allow.some(
      (entry: any) =>
        entry.type === 'address' &&
        entry.values?.some((v: any) => v.address === '*')
    )
  for (const service of services) {
    const serviceAllow = service.credentials?.allow

    const hasAddressAllow =
      Array.isArray(serviceAllow) &&
      serviceAllow.some((entry: any) => entry.type === 'address')

    if (!hasAddressAllow && rootAllowsAllAddresses) {
      if (
        service.credentials?.deny &&
        checkDenyList(service.credentials.deny)
      ) {
        return false
      }
      continue
    }
    if (hasAddressAllow && !checkAllowList(serviceAllow)) {
      return false
    }

    if (service.credentials?.deny && checkDenyList(service.credentials.deny)) {
      return false
    }
  }

  return true
}

export async function getAlgorithmDatasetsForComputeSelection(
  algorithmId: string,
  serviceId: string,
  datasetProviderUri: string,
  accountId: string,
  datasetChainId?: number,
  cancelToken?: CancelToken,
  tokenSymbolMap?: Record<string, string>
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
  const datasetsOnly = combined.filter(
    (asset) => asset?.credentialSubject?.metadata?.type === 'dataset'
  )
  const allowedDatasets = datasetsOnly.filter((asset) =>
    isAccountAllowed(asset, accountId)
  )
  const uniqueAssetsMap = new Map<string, any>()
  allowedDatasets.forEach((asset) => {
    if (!uniqueAssetsMap.has(asset.id)) {
      uniqueAssetsMap.set(asset.id, asset)
    }
  })

  const uniqueAssets = Array.from(uniqueAssetsMap.values())
  const datasets = await transformAssetToAssetSelectionDataset(
    datasetProviderUri,
    uniqueAssets,
    accountId,
    [],
    false,
    { algorithmDid: algorithmId, algorithmServiceId: serviceId },
    tokenSymbolMap
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
  const selectedBlockchainChainIds = getSupportedBlockchainChainIds(filtersList)
  const effectiveChainIds =
    selectedBlockchainChainIds.length > 0
      ? chainIds.filter((chainId) =>
          selectedBlockchainChainIds.includes(chainId)
        )
      : chainIds
  const filters: FilterTerm[] = []
  filters.push(
    getFilterTerm('indexedMetadata.nft.owner', accountId.toLowerCase())
  )
  if (filtersList) {
    parseFilters(filtersList, filterSets).forEach((term) => filters.push(term))
  }
  const baseQueryParams = {
    chainIds: effectiveChainIds,
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

interface RevenueServicePriceEntry {
  baseToken?: { address?: string; symbol?: string }
  price?: number | string
  token?: string | { address?: string; symbol?: string }
  tokenSymbol?: string
}

interface RevenueServiceStats {
  datatokenAddress?: string
  orders?: number
  price?: { tokenSymbol?: string }
  prices?: RevenueServicePriceEntry[]
  serviceId?: string
  symbol?: string
}

interface RevenueCredentialSubjectStats {
  price?: { tokenSymbol?: string }
}

function getRevenueNumber(value?: number | string): number {
  const parsed = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(parsed) ? parsed : 0
}

function findRevenueAccessDetails(
  asset: Asset,
  serviceIndex: number,
  serviceId?: string,
  datatokenAddress?: string
): AccessDetails | undefined {
  const accessDetails = (asset as Asset & { accessDetails?: AccessDetails[] })
    ?.accessDetails

  return (
    accessDetails?.find(
      (details) =>
        details?.datatoken?.address &&
        datatokenAddress &&
        details.datatoken.address.toLowerCase() ===
          datatokenAddress.toLowerCase()
    ) ||
    accessDetails?.find(
      (details) =>
        details?.addressOrId &&
        serviceId &&
        details.addressOrId.toLowerCase() === serviceId.toLowerCase()
    ) ||
    accessDetails?.[serviceIndex]
  )
}

function findRevenueStats(
  asset: Asset,
  serviceIndex: number,
  serviceId?: string,
  datatokenAddress?: string
): RevenueServiceStats | undefined {
  const stats = (asset.indexedMetadata?.stats || []) as RevenueServiceStats[]

  return (
    stats.find(
      (entry) =>
        (serviceId && entry.serviceId === serviceId) ||
        (datatokenAddress &&
          entry.datatokenAddress?.toLowerCase() ===
            datatokenAddress.toLowerCase())
    ) || stats[serviceIndex]
  )
}

function getRevenueTokenSymbol(
  asset: Asset,
  serviceIndex: number,
  serviceStats?: RevenueServiceStats,
  accessDetails?: AccessDetails,
  tokenSymbolMap?: Record<string, string>
): string | undefined {
  const priceEntry = serviceStats?.prices?.[0]
  const credentialSubjectStats = (
    asset.credentialSubject as typeof asset.credentialSubject & {
      stats?: RevenueCredentialSubjectStats
    }
  )?.stats

  return (
    accessDetails?.baseToken?.symbol ||
    priceEntry?.baseToken?.symbol ||
    resolveServiceTokenSymbol(
      asset,
      serviceIndex,
      serviceStats?.serviceId,
      tokenSymbolMap,
      serviceStats?.datatokenAddress
    ) ||
    priceEntry?.tokenSymbol ||
    serviceStats?.price?.tokenSymbol ||
    credentialSubjectStats?.price?.tokenSymbol ||
    (asset.indexedMetadata?.stats?.[serviceIndex] as RevenueServiceStats)?.price
      ?.tokenSymbol
  )
}

export function getAssetSalesAndRevenueByToken(
  asset: Asset,
  tokenSymbolMap?: Record<string, string>
): {
  totalOrders: number
  totalRevenue: number
  revenueByToken: { [symbol: string]: number }
} {
  let totalOrders = 0
  let totalRevenue = 0
  const revenueByToken: { [symbol: string]: number } = {}
  const services = asset.credentialSubject?.services || []
  const stats = (asset.indexedMetadata?.stats || []) as RevenueServiceStats[]
  const entries = services.length
    ? services.map((service, index) => ({
        datatokenAddress: service.datatokenAddress,
        index,
        serviceId: service.id
      }))
    : stats.map((entry, index) => ({
        datatokenAddress: entry.datatokenAddress,
        index,
        serviceId: entry.serviceId
      }))

  entries.forEach(({ datatokenAddress, index, serviceId }) => {
    const serviceStats = findRevenueStats(
      asset,
      index,
      serviceId,
      datatokenAddress
    )
    const accessDetails = findRevenueAccessDetails(
      asset,
      index,
      serviceId,
      serviceStats?.datatokenAddress || datatokenAddress
    )
    const orders = serviceStats?.orders || 0
    const priceEntry = serviceStats?.prices?.[0]
    const price = getRevenueNumber(accessDetails?.price ?? priceEntry?.price)
    const revenue = orders * price
    const tokenSymbol = getRevenueTokenSymbol(
      asset,
      index,
      serviceStats,
      accessDetails,
      tokenSymbolMap
    )

    totalOrders += orders
    totalRevenue += revenue
    if (!tokenSymbol) return
    if (!revenueByToken[tokenSymbol]) {
      revenueByToken[tokenSymbol] = 0
    }
    revenueByToken[tokenSymbol] += revenue
  })

  return { totalOrders, totalRevenue, revenueByToken }
}

export async function getUserSalesAndRevenue(
  accountId: string,
  chainIds: number[],
  filter?: Filters,
  cancelToken?: CancelToken,
  tokenSymbolMap?: Record<string, string>,
  ignorePurgatory = false,
  ignoreState = false
): Promise<{
  totalOrders: number
  totalRevenue: number
  revenueByToken: { [symbol: string]: number }
  revenueByNetwork: { [chainId: string]: { [symbol: string]: number } }
  results: Asset[]
}> {
  try {
    let page = 1
    let totalOrders = 0
    let totalRevenue = 0
    const revenueByToken: { [symbol: string]: number } = {}
    const revenueByNetwork: {
      [chainId: string]: { [symbol: string]: number }
    } = {}
    let assets: PagedAssets
    const allResults: Asset[] = []
    do {
      assets = await getPublishedAssets(
        accountId,
        chainIds,
        cancelToken || null,
        ignorePurgatory,
        ignoreState,
        filter,
        page
      )
      console.log('assets', assets)
      if (assets && assets.results) {
        assets.results.forEach((asset) => {
          const assetRevenue = getAssetSalesAndRevenueByToken(
            asset,
            tokenSymbolMap
          )
          totalOrders += assetRevenue.totalOrders
          totalRevenue += assetRevenue.totalRevenue
          Object.entries(assetRevenue.revenueByToken).forEach(
            ([symbol, amount]) => {
              if (!revenueByToken[symbol]) {
                revenueByToken[symbol] = 0
              }
              revenueByToken[symbol] += amount

              const chainId = asset.credentialSubject?.chainId?.toString()
              if (!chainId) return
              if (!revenueByNetwork[chainId]) revenueByNetwork[chainId] = {}
              if (!revenueByNetwork[chainId][symbol]) {
                revenueByNetwork[chainId][symbol] = 0
              }
              revenueByNetwork[chainId][symbol] += amount
            }
          )
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

    return {
      totalOrders,
      totalRevenue,
      revenueByToken,
      revenueByNetwork,
      results: allResults
    }
  } catch (error) {
    LoggerInstance.error('Error in getUserSales', error.message)
    return {
      totalOrders: 0,
      totalRevenue: 0,
      revenueByToken: {},
      revenueByNetwork: {},
      results: []
    }
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
  page?: number,
  orderTimestampsByDatatoken: Record<string, number> = {},
  orderIdsByDatatoken: Record<string, string> = {}
): Promise<{ downloadedAssets: DownloadedAsset[]; totalResults: number }> {
  const uniqueDatatokens = [
    ...new Map(
      dtList
        .filter((datatokenAddress) => !!datatokenAddress)
        .map((datatokenAddress) => [
          datatokenAddress.toLowerCase(),
          datatokenAddress
        ])
    ).values()
  ]

  if (uniqueDatatokens.length === 0 || chainIds?.length === 0) {
    return { downloadedAssets: [], totalResults: 0 }
  }

  const filters: FilterTerm[] = []
  filters.push(
    getFilterTerm(
      'credentialSubject.services.datatokenAddress.keyword',
      uniqueDatatokens
    )
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
      from: 0,
      size: uniqueDatatokens.length
    }
  } as BaseQueryParams
  const query = generateBaseQuery(baseQueryparams)
  try {
    const result = await queryMetadata(query, cancelToken)
    let downloadedAssets: DownloadedAsset[] = []
    const downloadedDatatokens = new Set(
      uniqueDatatokens.map((datatokenAddress) => datatokenAddress.toLowerCase())
    )

    if (result) {
      downloadedAssets = result?.results
        ?.map((asset) => {
          const timestampStr =
            asset?.indexedMetadata?.event?.datetime ??
            asset?.indexedMetadata?.nft?.created

          const timestamp = timestampStr
            ? new Date(timestampStr).getTime()
            : Date.now()
          const downloadedServices =
            asset?.credentialSubject?.services
              ?.map((service, serviceIndex) => {
                const stats = asset?.indexedMetadata?.stats?.find(
                  (entry) =>
                    entry?.datatokenAddress?.toLowerCase() ===
                    service?.datatokenAddress?.toLowerCase()
                )

                return {
                  datatokenAddress: service.datatokenAddress,
                  datatokenSymbol: stats?.symbol,
                  orderId:
                    orderIdsByDatatoken[service.datatokenAddress.toLowerCase()],
                  serviceId: service.id,
                  serviceIndex,
                  serviceName: service.name,
                  serviceTimestamp:
                    orderTimestampsByDatatoken[
                      service.datatokenAddress.toLowerCase()
                    ],
                  serviceType: service.type
                }
              })
              .filter((service) =>
                downloadedDatatokens.has(service.datatokenAddress.toLowerCase())
              ) || []

          const serviceTimestamps = downloadedServices
            .map((service) => service.serviceTimestamp || 0)
            .filter(Boolean)
          const latestServiceTimestamp = serviceTimestamps.length
            ? Math.max(...serviceTimestamps) * 1000
            : timestamp

          return {
            asset,
            networkId: asset?.credentialSubject?.chainId,
            dtSymbol:
              downloadedServices.length === 1
                ? downloadedServices[0].datatokenSymbol
                : `${downloadedServices.length} services`,
            downloadedServices,
            timestamp: latestServiceTimestamp
          }
        })
        .sort((a, b) => b.timestamp - a.timestamp)
    }

    const pageSize = 9
    const currentPage = Math.max(Number(page) || 1, 1)
    const paginatedAssets = downloadedAssets.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    )

    return {
      downloadedAssets: paginatedAssets,
      totalResults: downloadedAssets.length
    }
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
    const queryResults = (
      await Promise.all(
        getMetadataCacheUris().map((cacheUri) =>
          postMetadataQuery(cacheUri, query, cancelToken)
        )
      )
    ).filter((queryResult): queryResult is AquariusQueryResult =>
      Boolean(queryResult)
    )

    if (queryResults.length === 0) {
      return []
    }
    const tagsSet: Set<string> = new Set()
    queryResults.forEach((items) => {
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
