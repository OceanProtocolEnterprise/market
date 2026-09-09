import { LoggerInstance } from '@oceanprotocol/lib'
import {
  escapeEsReservedCharacters,
  generateBaseQuery,
  getFilterTerm,
  parseFilters,
  queryMetadata
} from '@utils/aquarius'
import queryString from 'query-string'
import { CancelToken } from 'axios'
import {
  SortDirectionOptions,
  SortTermOptions
} from '../../@types/aquarius/SearchQuery'
import { filterSets, getInitialFilters } from './Filter'
import { State } from 'src/@types/ddo/State'

export function updateQueryStringParameter(
  uri: string,
  key: string,
  newValue: string
): string {
  const regex = new RegExp('([?&])' + key + '=.*?(&|$)', 'i')
  const separator = uri.indexOf('?') !== -1 ? '&' : '?'

  if (uri.match(regex)) {
    return uri.replace(regex, '$1' + key + '=' + newValue + '$2')
  } else {
    return uri + separator + key + '=' + newValue
  }
}

export function buildSearchPageUrl(
  pathname: string,
  search: string,
  page: number
): string {
  const parsed = queryString.parse(search, {
    arrayFormat: 'separator',
    arrayFormatSeparator: ','
  })

  parsed.page = String(page)

  const query = queryString.stringify(parsed, {
    arrayFormat: 'separator',
    arrayFormatSeparator: ','
  })

  return query ? `${pathname}?${query}` : pathname
}

function normalizeSearchPage(page?: string): number {
  const parsedPage = Number(page)

  return Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1
}

function getSearchQuery(
  chainIds: number[],
  text?: string,
  owner?: string,
  tags?: string,
  page?: string,
  offset?: string,
  sort?: string,
  sortDirection?: string,
  serviceType?: string | string[],
  accessType?: string | string[],
  priceType?: string | string[],
  supportedBlockchain?: string | string[],
  filterSet?: string | string[],
  assetState?: string | string[],
  nodeUriIndex?: string | string[]
): SearchQuery {
  text = escapeEsReservedCharacters(text)
  const emptySearchTerm = text === undefined || text === ''
  const filters: FilterTerm[] = []
  if (assetState) {
    const normalizeState = (s: string): number => Number(s)

    if (Array.isArray(assetState)) {
      const stateNumbers = assetState
        .map(normalizeState)
        .filter((v) => !isNaN(v))
      if (stateNumbers.length > 0) {
        filters.push({
          terms: {
            'indexedMetadata.nft.state': stateNumbers
          }
        })
      }
    } else {
      const stateNumber = normalizeState(assetState)
      if (!isNaN(stateNumber)) {
        filters.push({
          term: {
            'indexedMetadata.nft.state': stateNumber
          }
        })
      }
    }
  } else {
    filters.push({
      term: {
        'indexedMetadata.nft.state': State.Active
      }
    })
  }

  let searchTerm = text || ''
  let nestedQuery
  if (tags) {
    filters.push(getFilterTerm('metadata.tags.keyword', tags))
  } else {
    searchTerm = searchTerm.trim()
    const modifiedSearchTerm = searchTerm.split(' ').join(' OR ').trim()
    const noSpaceSearchTerm = searchTerm.split(' ').join('').trim()

    const prefixedSearchTerm =
      emptySearchTerm && searchTerm
        ? searchTerm
        : !emptySearchTerm && searchTerm
        ? '*' + searchTerm + '*'
        : '**'
    const searchFields = [
      'id',
      'indexedMetadata.nft.owner',
      'indexedMetadata.stats.datatokenAddress',
      'indexedMetadata.stats.name',
      'indexedMetadata.stats.symbol',
      'credentialSubject.metadata.name^10',
      'credentialSubject.metadata.author',
      'credentialSubject.metadata.description',
      'credentialSubject.metadata.tags'
    ]

    nestedQuery = {
      must: [
        {
          bool: {
            should: [
              {
                query_string: {
                  query: `${modifiedSearchTerm}`,
                  fields: searchFields,
                  minimum_should_match: '2<75%',
                  phrase_slop: 2,
                  boost: 5
                }
              },
              {
                query_string: {
                  query: `${noSpaceSearchTerm}*`,
                  fields: searchFields,
                  boost: 5,
                  lenient: true
                }
              },
              {
                match_phrase: {
                  content: {
                    query: `${searchTerm}`,
                    boost: 10
                  }
                }
              },
              {
                query_string: {
                  query: `${prefixedSearchTerm}`,
                  fields: searchFields,
                  default_operator: 'AND'
                }
              }
            ]
          }
        }
      ]
    }
  }

  const selectedBlockchainIds = (
    Array.isArray(supportedBlockchain)
      ? supportedBlockchain
      : supportedBlockchain
      ? [supportedBlockchain]
      : []
  )
    .map((chainId) => Number(chainId))
    .filter((chainId) => Number.isFinite(chainId))

  const effectiveChainIds =
    selectedBlockchainIds.length > 0
      ? chainIds.filter((chainId) => selectedBlockchainIds.includes(chainId))
      : chainIds

  const filtersList = getInitialFilters(
    { accessType, serviceType, priceType, filterSet, nodeUriIndex },
    ['accessType', 'serviceType', 'priceType', 'filterSet', 'nodeUriIndex']
  )
  parseFilters(filtersList, filterSets).forEach((term) => filters.push(term))
  const normalizedPage = normalizeSearchPage(page)

  const baseQueryParams = {
    chainIds: effectiveChainIds,
    nestedQuery,
    esPaginationOptions: {
      from: normalizedPage,
      size: Number(offset) || 21
    },
    sortOptions: { sortBy: sort, sortDirection },
    filters
  } as BaseQueryParams

  const query = generateBaseQuery(baseQueryParams)
  return query
}

export async function getResults(
  params: {
    text?: string
    owner?: string
    tags?: string
    categories?: string
    page?: string
    offset?: string
    sort?: string
    sortOrder?: string
    serviceType?: string | string[]
    accessType?: string | string[]
    priceType?: string | string[]
    supportedBlockchain?: string | string[]
    filterSet?: string[]
    assetState?: string | string[]
    nodeUriIndex?: string | string[]
  },
  chainIds: number[],
  cancelToken?: CancelToken
): Promise<PagedAssets> {
  const {
    text,
    owner,
    tags,
    page,
    offset,
    sort,
    sortOrder,
    serviceType,
    accessType,
    priceType,
    supportedBlockchain,
    filterSet,
    assetState,
    nodeUriIndex
  } = params

  const normalizedPage = normalizeSearchPage(page)
  const searchQuery = getSearchQuery(
    chainIds,
    text,
    owner,
    tags,
    page,
    offset,
    sort,
    sortOrder,
    serviceType,
    accessType,
    priceType,
    supportedBlockchain,
    filterSet,
    assetState,
    nodeUriIndex
  )
  const queryResult = await queryMetadata(searchQuery, cancelToken)

  const normalizedQueryResult = queryResult
    ? {
        ...queryResult,
        page: normalizedPage
      }
    : queryResult

  return normalizedQueryResult?.results?.length === 0
    ? {
        ...normalizedQueryResult,
        totalPages: 0,
        totalResults: 0
      }
    : normalizedQueryResult
}

export async function addExistingParamsToUrl(
  location: Location,
  excludedParams: string[]
): Promise<string> {
  const parsed = queryString.parse(location.search)
  let urlLocation = '/search?'
  if (Object.keys(parsed).length > 0) {
    for (const queryParam in parsed) {
      if (!excludedParams.includes(queryParam)) {
        if (queryParam === 'page' && excludedParams.includes('text')) {
          LoggerInstance.log('remove page when starting a new search')
        } else {
          const value = parsed[queryParam]
          urlLocation = `${urlLocation}${queryParam}=${value}&`
        }
      }
    }
  } else {
    // sort should be relevance when fixed in aqua
    urlLocation = `${urlLocation}sort=${encodeURIComponent(
      SortTermOptions.Created
    )}&sortOrder=${SortDirectionOptions.Descending}&`
  }
  urlLocation = urlLocation.slice(0, -1)
  return urlLocation
}
