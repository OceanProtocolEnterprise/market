import {
  SortDirectionOptions,
  SortTermOptions
} from '../../@types/aquarius/SearchQuery'
import {
  escapeEsReservedCharacters,
  getFilterTerm,
  generateBaseQuery,
  getWhitelistShould,
  sortMergedResults
} from '.'
import { Asset } from 'src/@types/Asset'

const defaultBaseQueryReturn: SearchQuery = {
  from: 0,
  query: {
    bool: {
      filter: [
        { terms: { chainId: [1, 3] } },
        { term: { _index: 'aquarius' } },
        { term: { 'purgatory.state': false } },
        {
          bool: {
            must_not: [
              { term: { 'nft.state': 5 } },
              { term: { 'price.type': 'pool' } }
            ]
          }
        }
      ]
    }
  },
  size: 1000
}

// add whitelist filtering
if (getWhitelistShould()?.length > 0) {
  const whitelistQuery = {
    bool: {
      should: [...getWhitelistShould()],
      minimum_should_match: 1
    }
  }
  Object.hasOwn(defaultBaseQueryReturn.query.bool, 'must')
    ? defaultBaseQueryReturn.query.bool.must.push(whitelistQuery)
    : (defaultBaseQueryReturn.query.bool.must = [whitelistQuery])
}

describe('@utils/aquarius', () => {
  test('escapeEsReservedCharacters', () => {
    expect(escapeEsReservedCharacters('<')).toBe('\\<')
  })

  test('getFilterTerm with string value', () => {
    expect(getFilterTerm('hello', 'world')).toStrictEqual({
      term: { hello: 'world' }
    })
  })

  test('getFilterTerm with array value', () => {
    expect(getFilterTerm('hello', ['world', 'domination'])).toStrictEqual({
      terms: { hello: ['world', 'domination'] }
    })
  })

  test('generateBaseQuery', () => {
    expect(generateBaseQuery({ chainIds: [1, 3] })).toStrictEqual(
      defaultBaseQueryReturn
    )
  })

  test('generateBaseQuery aggs are passed through', () => {
    expect(
      generateBaseQuery({ chainIds: [1, 3], aggs: 'hello world' })
    ).toStrictEqual({
      ...defaultBaseQueryReturn,
      aggs: 'hello world'
    })
  })

  test('generateBaseQuery sortOptions are passed through', () => {
    expect(
      generateBaseQuery({
        chainIds: [1, 3],
        sortOptions: {
          sortBy: SortTermOptions.Created,
          sortDirection: SortDirectionOptions.Ascending
        }
      })
    ).toStrictEqual({
      ...defaultBaseQueryReturn,
      sort: {
        'indexedMetadata.event.block': 'asc'
      }
    })
  })

  test('sortMergedResults sorts created assets by time across chains', () => {
    const olderOpAsset = {
      id: 'op-sepolia',
      indexedMetadata: {
        event: {
          block: 44114188,
          datetime: '2026-05-29T05:01:56.000Z'
        }
      }
    } as Asset
    const newerEthAsset = {
      id: 'eth-sepolia',
      indexedMetadata: {
        event: {
          block: 10567100,
          datetime: '2026-06-01T10:00:00.000Z'
        }
      }
    } as Asset

    expect(
      sortMergedResults([olderOpAsset, newerEthAsset], {
        [SortTermOptions.Created]: SortDirectionOptions.Descending
      }).map((asset) => asset.id)
    ).toStrictEqual(['eth-sepolia', 'op-sepolia'])
  })
})
