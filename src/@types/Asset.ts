import { IndexedMetadata } from '@oceanprotocol/ddo-js'
import { Credential } from './ddo/VerifiableCredential'

export interface AssetNft {
  /**
   * Contract address of the deployed ERC721 NFT contract.
   * @type {string}
   */
  address: string

  /**
   * Name of NFT set in contract.
   * @type {string}
   */
  name: string

  /**
   * Symbol of NFT set in contract.
   * @type {string}
   */
  symbol: string

  /**
   * ETH account address of the NFT owner.
   * @type {string}
   */
  owner: string

  /**
   * State of the asset reflecting the NFT contract value.
   * 0	Active.
   * 1	End-of-life.
   * 2	Deprecated (by another asset).
   * 3	Revoked by publisher.
   * 4	Ordering is temporary disabled.
   * 5  Unlisted in markets.
   * @type {number}
   */
  state: 0 | 1 | 2 | 3 | 4 | 5

  /**
   * Contains the date of NFT creation.
   * @type {string}
   */
  created: string

  /**
   * NFT token URI.
   * @type {string}
   */
  tokenURI: string
}

export interface AssetDatatoken {
  /**
   * Contract address of the deployed Datatoken contract.
   * @type {string}
   */
  address: string

  /**
   * Name of NFT set in contract.
   * @type {string}
   */
  name: string

  /**
   * Symbol of NFT set in contract.
   * @type {string}
   */
  symbol: string

  /**
   * ID of the service the datatoken is attached to.
   * @type {string}
   */
  serviceId: string
}

export interface AssetPrice {
  /**
   * The price of the asset expressed as a number. If 0 then the price is FREE.
   * @type {number}
   */
  value: number

  /**
   * The symbol that the price of the asset is expressed in.
   * @type {string}
   */
  tokenSymbol?: string

  /**
   * The address of the token that the price needs to be paid in.
   * @type {string}
   */
  tokenAddress?: string
}

export interface Asset extends Credential {
  indexedMetadata: IndexedMetadata
}
