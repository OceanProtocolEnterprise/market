import {
  AssetPrice,
  Datatoken,
  FixedRateExchange,
  getErrorMessage,
  LoggerInstance,
  ProviderFees,
  ProviderInstance,
  Service,
  ZERO_ADDRESS
} from '@oceanprotocol/lib'
import { getFixedBuyPrice } from './ocean/fixedRateExchange'
import Decimal from 'decimal.js'
import {
  consumeMarketOrderFee,
  publisherMarketOrderFee,
  customProviderUrl
} from '../../app.config'
import { Signer } from 'ethers'
import { toast } from 'react-toastify'
import { getDummySigner } from './wallet'

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
  const orderPriceAndFee = {
    price: accessDetails.price || '0',
    publisherMarketOrderFee: publisherMarketOrderFee || '0',
    publisherMarketFixedSwapFee: '0',
    consumeMarketOrderFee: consumeMarketOrderFee || '0',
    consumeMarketFixedSwapFee: '0',
    providerFee: {
      providerFeeAmount: '0'
    },
    opcFee: '0'
  } as OrderPriceAndFees
  // fetch provider fee
  let initializeData
  try {
    initializeData =
      !providerFees &&
      (await ProviderInstance.initialize(
        asset.id,
        service.id,
        0,
        accountId,
        customProviderUrl || service.serviceEndpoint
      ))
  } catch (error) {
    const message = getErrorMessage(error.message)
    LoggerInstance.error('[Initialize Provider] Error:', message)

    // Customize error message for accountId non included in allow list
    if (
      // TODO: verify if the error code is correctly resolved by the provider
      message.includes('ConsumableCodes.CREDENTIAL_NOT_IN_ALLOW_LIST') ||
      message.includes('denied with code: 3')
    ) {
      if (accountId !== ZERO_ADDRESS) {
        toast.error(
          `Consumer address not found in allow list for service ${asset.id}. Access has been denied.`
        )
      }
      return
    }
    // Customize error message for accountId included in deny list
    if (
      // TODO: verify if the error code is correctly resolved by the provider
      message.includes('ConsumableCodes.CREDENTIAL_IN_DENY_LIST') ||
      message.includes('denied with code: 4')
    ) {
      if (accountId !== ZERO_ADDRESS) {
        toast.error(
          `Consumer address found in deny list for service ${asset.id}. Access has been denied.`
        )
      }
      return
    }
    toast.error(message)
  }
  orderPriceAndFee.providerFee = providerFees || initializeData.providerFee

  // fetch price and swap fees
  if (accessDetails.type === 'fixed') {
    const fixed = await getFixedBuyPrice(accessDetails, asset.chainId, signer)
    orderPriceAndFee.price = accessDetails.price
    orderPriceAndFee.opcFee = fixed.oceanFeeAmount
    orderPriceAndFee.publisherMarketFixedSwapFee = fixed.marketFeeAmount
    orderPriceAndFee.consumeMarketFixedSwapFee = fixed.consumeMarketFeeAmount
  }

  const price = new Decimal(+accessDetails.price || 0)
  const consumeMarketFeePercentage =
    +orderPriceAndFee?.consumeMarketOrderFee || 0
  const publisherMarketFeePercentage =
    +orderPriceAndFee?.publisherMarketOrderFee || 0

  // Calculate percentage-based fees
  const consumeMarketFee = price.mul(consumeMarketFeePercentage).div(100)
  const publisherMarketFee = price.mul(publisherMarketFeePercentage).div(100)

  // Calculate total
  const result = price.add(consumeMarketFee).add(publisherMarketFee).toString()
  orderPriceAndFee.price = result
  return orderPriceAndFee
}

/**
 * @param {number} chainId
 * @param {Service} service service of which you want access details to
 * @returns {Promise<AccessDetails>}
 */
export async function getAccessDetails(
  chainId: number,
  service: Service
): Promise<AccessDetails> {
  const signer = await getDummySigner(chainId)
  const datatoken = new Datatoken(signer, chainId)
  const { datatokenAddress } = service

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
      name: await datatoken.getName(datatokenAddress),
      symbol: await datatoken.getSymbol(datatokenAddress),
      decimals: 0
    },
    paymentCollector: await datatoken.getPaymentCollector(datatokenAddress),
    templateId: await datatoken.getId(datatokenAddress),
    // TODO these 4 records
    isOwned: false,
    validOrderTx: '', // should be possible to get from ocean-node - orders collection in typesense
    isPurchasable: true,
    publisherMarketOrderFee: '0'
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
    const freAddress = fixedRates[0].contractAddress
    const exchangeId = fixedRates[0].id
    const fre = new FixedRateExchange(freAddress, signer)
    const exchange = await fre.getExchange(exchangeId)

    return {
      ...accessDetails,
      type: 'fixed',
      addressOrId: exchangeId,
      price: exchange.fixedRate,
      baseToken: {
        address: exchange.baseToken,
        name: await datatoken.getName(exchange.baseToken), // reuse the datatoken instance since it is ERC20
        symbol: await datatoken.getSymbol(exchange.baseToken),
        decimals: parseInt(exchange.btDecimals)
      }
    }
  }

  // no dispensers and no fixed rates => service doesn't have price set up
  return accessDetails
}

export function getAvailablePrice(accessDetails: AccessDetails): AssetPrice {
  const price: AssetPrice = {
    value: Number(accessDetails.price),
    tokenSymbol: accessDetails.baseToken?.symbol,
    tokenAddress: accessDetails.baseToken?.address
  }

  return price
}
