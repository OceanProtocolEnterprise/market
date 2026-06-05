import {
  SortDirectionOptions,
  SortTermOptions
} from '../../@types/aquarius/SearchQuery'
import { Asset } from '../../@types/Asset'
import {
  escapeEsReservedCharacters,
  getFilterTerm,
  generateBaseQuery,
  getWhitelistShould,
  getAssetSalesAndRevenueByToken
} from '.'

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

  test('getAssetSalesAndRevenueByToken aggregates every service', () => {
    const asset = {
      credentialSubject: {
        services: [
          {
            id: 'service-1',
            datatokenAddress: '0xdt1'
          },
          {
            id: 'service-2',
            datatokenAddress: '0xdt2'
          },
          {
            id: 'service-3',
            datatokenAddress: '0xdt3'
          }
        ]
      },
      indexedMetadata: {
        stats: [
          {
            datatokenAddress: '0xdt1',
            orders: 0,
            prices: [{ price: 0, tokenSymbol: 'OEAT' }],
            serviceId: 'service-1'
          },
          {
            datatokenAddress: '0xdt2',
            orders: 1,
            prices: [{ price: 1, token: '0xeurc', tokenSymbol: 'OCEAN' }],
            serviceId: 'service-2'
          },
          {
            datatokenAddress: '0xdt3',
            orders: 1,
            prices: [{ price: 2, token: '0xusdc', tokenSymbol: 'OCEAN' }],
            serviceId: 'service-3'
          }
        ]
      }
    } as unknown as Asset

    expect(
      getAssetSalesAndRevenueByToken(asset, {
        '0xeurc': 'EURC',
        '0xusdc': 'USDC'
      })
    ).toStrictEqual({
      totalOrders: 2,
      totalRevenue: 3,
      revenueByToken: {
        OEAT: 0,
        EURC: 1,
        USDC: 2
      }
    })
  })
})
