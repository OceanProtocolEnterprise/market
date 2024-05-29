export enum SortDirectionOptions {
  Ascending = 'asc',
  Descending = 'desc'
}

export enum SortTermOptions {
  Created = 'nft.created',
  Relevance = '_score',
  Orders = 'stats.orders',
  Allocated = 'stats.allocated',
  Price = 'stats.price.value'
}

// Note: could not figure out how to get `enum` to be ambiant
// as final compiled js won't have it then.
// Only export/import works for that, so this file is NOT .d.ts file ending
// and gets imported in components.

export enum FilterOptions {
  AccessType = 'accessType',
  ServiceType = 'serviceType'
}

export enum FilterByTypeOptions {
  Data = 'dataset',
  Algorithm = 'algorithm'
}

export enum FilterByAccessOptions {
  Download = 'access',
  Compute = 'compute'
}

declare global {
  interface SortOptions {
    sortBy: SortTermOptions
    sortDirection?: SortDirectionOptions
  }

  interface FilterTerm {
    [property: string]: {
      [property: string]: string | number | boolean | number[] | string[]
    }
  }

  type Filters = FilterByTypeOptions | FilterByAccessOptions

  interface SearchQuery {
    from?: number
    size?: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: any
    sort?: { [jsonPath: string]: SortDirectionOptions }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    aggs?: any
  }
}

type TypesenseOperationMode = 'off' | 'always' | 'fallback'

export interface TypesenseSearchParams {
  // From https://typesense.org/docs/26.0/api/search.html#search-parameters
  q: string
  query_by: string | string[]
  query_by_weights?: string | number[]
  prefix?: string | boolean | boolean[] // default: true
  filter_by?: string
  sort_by?: string | string[] // default: text match desc
  facet_by?: string | string[]
  max_facet_values?: number
  facet_query?: string
  facet_query_num_typos?: number
  page?: number // default: 1
  per_page?: number // default: 10, max 250
  group_by?: string | string[]
  group_limit?: number // default:
  include_fields?: string | string[]
  exclude_fields?: string | string[]
  highlight_fields?: string | string[] // default: all queried fields
  highlight_full_fields?: string | string[] // default: all fields
  highlight_affix_num_tokens?: number // default: 4
  highlight_start_tag?: string // default: <mark>
  highlight_end_tag?: string // default: </mark>
  snippet_threshold?: number // default: 30
  num_typos?: string | number | number[] // default: 2
  min_len_1typo?: number
  min_len_2typo?: number
  split_join_tokens?: TypesenseOperationMode
  exhaustive_search?: boolean
  drop_tokens_threshold?: number // default: 10
  typo_tokens_threshold?: number // default: 100
  pinned_hits?: string | string[]
  hidden_hits?: string | string[]
  limit_hits?: number // default: no limit
  pre_segmented_query?: boolean
  enable_overrides?: boolean
  prioritize_exact_match?: boolean // default: true
  prioritize_token_position?: boolean
  search_cutoff_ms?: number
  use_cache?: boolean
  max_candidates?: number
  infix?: TypesenseOperationMode | TypesenseOperationMode[]
  preset?: string
  text_match_type?: 'max_score' | 'max_weight'
  vector_query?: string
  'x-typesense-api-key'?: string
  'x-typesense-user-id'?: string
  offset?: number
  limit?: number
}

export interface TypesenseSearchResponse {
  facet_counts?: any[]
  found: number
  found_docs?: number
  out_of: number
  page: number
  request_params: any
  search_time_ms: number
  hits?: { document: any }[]
  grouped_hits?: {
    group_key: string[]
    hits: any[]
    found?: number
  }[]
}
