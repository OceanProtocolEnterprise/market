import {
  Datatoken,
  FixedRateExchange,
  getErrorMessage,
  LoggerInstance,
  ProviderFees,
  ProviderInstance
} from '@oceanprotocol/lib'
import { getFixedBuyPrice } from './ocean/fixedRateExchange'
import {
  publisherMarketOrderFee,
  customProviderUrl
} from '../../app.config.cjs'
import { Signer } from 'ethers'
import { getDummySigner, getTokenInfo } from './wallet'
import { Service } from '../@types/ddo/Service'
import { AssetExtended } from '../@types/AssetExtended'
import axios, { CancelToken } from 'axios'
import { getUserOrders } from './aquarius'
import { AssetPrice } from '../@types/AssetPrice'
import { getConsumeMarketFeeWei } from './consumeMarketFee'

export const tokenInfoCache = new Map<string, TokenInfo>()
export async function getCachedTokenInfo(
  address: string,
  provider: any
): Promise<TokenInfo> {
  const key = address.toLowerCase()
  if (tokenInfoCache.has(key)) {
    return tokenInfoCache.get(key) as TokenInfo
  }
  const info = await getTokenInfo(address, provider)
  tokenInfoCache.set(key, info)
  return info
}

function getErrorRecordValue(
  value: unknown,
  key: 'error' | 'message'
): string | undefined {
  if (typeof value !== 'object' || value === null || !(key in value)) return
  const entry = (value as Record<string, unknown>)[key]
  return typeof entry === 'string' && entry.trim() ? entry.trim() : undefined
}

export function getProviderInitializationErrorMessage(error: unknown): string {
  const responseData =
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response
      ? error.response.data
      : undefined

  const responseMessage =
    getErrorRecordValue(responseData, 'error') ||
    getErrorRecordValue(responseData, 'message')
  if (responseMessage) return responseMessage

  const rawMessage =
    typeof responseData === 'string' && responseData.trim()
      ? responseData.trim()
      : error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : 'Provider initialization failed.'

  return rawMessage.trim().startsWith('{')
    ? getErrorMessage(rawMessage)
    : rawMessage
}

export async function recoverProviderInitializationErrorMessage(
  error: unknown,
  assetId: string,
  serviceId: string,
  accountId: string,
  serviceEndpoint: string
): Promise<string> {
  const originalMessage = getProviderInitializationErrorMessage(error)
  const isPlainTextParseFailure =
    originalMessage.includes('Unexpected token') &&
    originalMessage.includes('not valid JSON')

  if (!isPlainTextParseFailure) return originalMessage

  const nodeUrl = serviceEndpoint.replace(/\/+$/, '')
  try {
    const response = await axios.get<string>(
      `${nodeUrl}/api/services/initialize`,
      {
        params: {
          documentId: assetId,
          serviceId,
          fileIndex: 0,
          consumerAddress: accountId
        },
        responseType: 'text',
        validateStatus: () => true
      }
    )

    const responseMessage =
      typeof response.data === 'string' ? response.data.trim() : ''
    return responseMessage || originalMessage
  } catch {
    return originalMessage
  }
}

/**
 * This will be used to get price including fees before ordering
 * @param {AssetExtended} asset
 * @return {Promise<OrdePriceAndFee>}
 */
export async function getOrderPriceAndFees(
  asset: AssetExtended,
  service: Service,
  accessDetails: AccessDetails,
  accountId: string,
  signer?: Signer,
  providerFees?: ProviderFees
): Promise<OrderPriceAndFees> {
  const chainId = asset.credentialSubject.chainId.toString()
  const tokenAddress = accessDetails.baseToken.address.toLowerCase()
  const orderFee = getConsumeMarketFeeWei({
    chainId,
    baseTokenAddress: tokenAddress,
    baseTokenDecimals: accessDetails.baseToken?.decimals || 18,
    price: accessDetails.price || '0'
  }).totalFeeWei
  const orderPriceAndFee = {
    price: accessDetails.price || '0',
    publisherMarketOrderFee: publisherMarketOrderFee || '0',
    publisherMarketFixedSwapFee: '0',
    consumeMarketOrderFee: orderFee,
    consumeMarketFixedSwapFee: '0',
    providerFee: {
      providerFeeAmount: '0'
    },
    opcFee: '0'
  } as OrderPriceAndFees
  // fetch provider fee
  let initializeData
  try {
    let initialize = null
    if (service.type === 'compute') {
      console.warn('service type is compute')
    } else {
      initialize = await ProviderInstance.initialize(
        asset.id,
        service.id,
        0,
        accountId,
        service?.serviceEndpoint || customProviderUrl
      )
    }
    initializeData = !providerFees && initialize
  } catch (error) {
    let message = await recoverProviderInitializationErrorMessage(
      error,
      asset.id,
      service.id,
      accountId,
      service?.serviceEndpoint || customProviderUrl
    )
    LoggerInstance.error('[Initialize Provider] Error:', message)

    // Customize error message for accountId non included in allow list
    if (
      // TODO: verify if the error code is correctly resolved by the provider
      message.includes('ConsumableCodes.CREDENTIAL_NOT_IN_ALLOW_LIST') ||
      message.includes('denied with code: 3')
    ) {
      message = `Consumer address not found in allow list for service ${asset.id}. Access has been denied.`
    }
    // Customize error message for accountId included in deny list
    if (
      // TODO: verify if the error code is correctly resolved by the provider
      message.includes('ConsumableCodes.CREDENTIAL_IN_DENY_LIST') ||
      message.includes('denied with code: 4')
    ) {
      message = `Consumer address found in deny list for service ${asset.id}. Access has been denied.`
    }
    throw new Error(message)
  }
  orderPriceAndFee.providerFee = providerFees || initializeData?.providerFee
  // fetch price and swap fees
  if (accessDetails.type === 'fixed') {
    const fixed = await getFixedBuyPrice(
      accessDetails,
      asset.credentialSubject.chainId,
      signer
    )
    orderPriceAndFee.price = accessDetails.price
    orderPriceAndFee.baseTokenAmount = fixed?.baseTokenAmount || '0'
    orderPriceAndFee.opcFee = fixed?.oceanFeeAmount || '0'
    orderPriceAndFee.publisherMarketFixedSwapFee = fixed?.marketFeeAmount || '0'
    orderPriceAndFee.consumeMarketFixedSwapFee =
      fixed?.consumeMarketFeeAmount || '0'
  }

  return orderPriceAndFee
}

/**
 * @param {number} chainId
 * @param {Service} service service of which you want access details to
 * @returns {Promise<AccessDetails>}
 */
export async function getAccessDetails(
  chainId: number,
  service: Service,
  accountId: string,
  cancelToken: CancelToken
): Promise<AccessDetails> {
  const signer = await getDummySigner(chainId)
  const datatoken = new Datatoken(signer, chainId)
  const { datatokenAddress } = service

  const [dtName, dtSymbol, paymentCollector, templateId] = await Promise.all([
    datatoken.getName(datatokenAddress),
    datatoken.getSymbol(datatokenAddress),
    datatoken.getPaymentCollector(datatokenAddress),
    datatoken.getId(datatokenAddress)
  ])

  const accessDetails: AccessDetails = {
    type: 'NOT_SUPPORTED',
    price: '0',
    addressOrId: '',
    baseToken: {
      address: '',
      name: '',
      symbol: '',
      decimals: 0
    },
    datatoken: {
      address: datatokenAddress,
      name: dtName,
      symbol: dtSymbol,
      decimals: 0
    },
    paymentCollector,
    templateId,
    // TODO these 4 records
    isOwned: false,
    validOrderTx: '', // should be possible to get from ocean-node - orders collection in typesense
    isPurchasable: true,
    publisherMarketOrderFee: '0'
  }
  try {
    // Check for past orders
    let allOrders: any[] = []
    let page = 1
    let totalPages = 1

    // Fetch all orders across all pages
    while (page <= totalPages) {
      const filter =
        service.type === 'compute' ? 'payer.keyword' : 'consumer.keyword'
      const res = await getUserOrders(accountId, cancelToken, page, filter)
      allOrders = allOrders.concat(res?.results || [])
      const orderTotal = res?.totalPages || 0
      totalPages = orderTotal
      page++
    }
    const matchingOrders = allOrders.filter(
      (order) =>
        order.datatokenAddress.toLowerCase() ===
          datatokenAddress.toLowerCase() ||
        order.payer.toLowerCase() === datatokenAddress.toLowerCase()
    )

    const order = matchingOrders.reduce((prev, curr) => {
      return curr.timestamp > prev.timestamp ? curr : prev
    }, matchingOrders[0])

    if (order) {
      const orderTimestamp = order.timestamp
      const timeout = Number(service.timeout)
      const now = Date.now()

      const isValid =
        timeout === 0 ||
        (orderTimestamp && orderTimestamp * 1000 + timeout * 1000 > now)
      accessDetails.isOwned = isValid
      accessDetails.validOrderTx = isValid ? order.orderId : ''
    }
  } catch (err) {
    LoggerInstance.error('[getAccessDetails] Failed to fetch user orders', err)
  }

  // if there is at least 1 dispenser => service is free and use first dispenser
  const dispensers = await datatoken.getDispensers(datatokenAddress)
  if (dispensers.length > 0) {
    return {
      ...accessDetails,
      type: 'free',
      addressOrId: dispensers[0],
      price: '0'
    }
  }

  // if there is 0 dispensers and at least 1 fixed rate => use first fixed rate to get the price details
  const fixedRates = await datatoken.getFixedRates(datatokenAddress)
  if (fixedRates.length > 0) {
    try {
      const freAddress = fixedRates[0].contractAddress
      const exchangeId = fixedRates[0].id
      const fre = new FixedRateExchange(freAddress, signer, chainId)

      const exchange = await fre.getExchange(exchangeId)
      const tokenInfo = await getTokenInfo(exchange.baseToken, signer.provider)
      // console.log('accessdetails: data token info', tokenInfo)
      // const testName = await datatoken.getName(exchange.baseToken)
      // console.log('accessdetails: data token name', testName)
      // const testSymbol = await datatoken.getSymbol(exchange.baseToken)
      // console.log('accessdetails: data token symbol', testSymbol)

      return {
        ...accessDetails,
        type: 'fixed',
        addressOrId: exchangeId,
        price: exchange.fixedRate,
        baseToken: {
          address: exchange.baseToken,
          name: tokenInfo?.name, // reuse the datatoken instance since it is ERC20
          symbol: tokenInfo?.symbol,
          decimals: tokenInfo?.decimals || parseInt(exchange.btDecimals)
        }
      }
    } catch (error) {
      console.error('Error fetching fixed rate exchange', error)
      return accessDetails
    }
  }

  // no dispensers and no fixed rates => service doesn't have price set up
  return accessDetails
}

export function getAvailablePrice(accessDetails: AccessDetails): AssetPrice {
  const price: AssetPrice = {
    value: Number(accessDetails?.price || 0),
    tokenSymbol: accessDetails?.baseToken?.symbol,
    tokenAddress: accessDetails?.baseToken?.address
  }

  return price
}
