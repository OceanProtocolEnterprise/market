import { parseUnits } from 'ethers'
import { consumeMarketOrderFee, consumeMarketFee } from '../../app.config.cjs'

type ConsumeMarketFeeParams = {
  chainId?: number | string
  baseTokenAddress?: string
  baseTokenDecimals?: number
  price?: string | number
}

type ConsumeMarketFeeResult = {
  totalFeeWei: string
  orderFeeWei: string
  percentFeeWei: string
}

const PERCENT_BASE = BigInt('1000000000000000000') // 1e18

function parseConsumeMarketOrderFeeMap(): Record<
  string,
  { token: string; amount: string }[]
> {
  if (!consumeMarketOrderFee) return {}
  try {
    return JSON.parse(consumeMarketOrderFee)
  } catch (error) {
    console.error('[consumeMarketFee] Failed to parse fee map', error)
    return {}
  }
}

function toBigIntSafe(value?: string): bigint {
  if (!value) return BigInt(0)
  try {
    return BigInt(value)
  } catch {
    return BigInt(0)
  }
}

export function getConsumeMarketFeeWei({
  chainId,
  baseTokenAddress,
  baseTokenDecimals,
  price
}: ConsumeMarketFeeParams): ConsumeMarketFeeResult {
  if (!baseTokenAddress || chainId === undefined || chainId === null) {
    return { totalFeeWei: '0', orderFeeWei: '0', percentFeeWei: '0' }
  }

  const envFeeConfig = parseConsumeMarketOrderFeeMap()
  const chainFees = envFeeConfig[String(chainId)] || []
  const tokenAddress = baseTokenAddress.toLowerCase()
  const matchingFeeEntry = chainFees.find(
    (f) => f.token?.toLowerCase() === tokenAddress
  )
  const orderFeeWei = matchingFeeEntry?.amount || '0'
  const orderFeeBigInt = toBigIntSafe(orderFeeWei)

  let percentFeeWei = BigInt(0)
  const percentString = consumeMarketFee || '0'
  const decimals = baseTokenDecimals ?? 18
  try {
    const percentFixed = parseUnits(percentString, 18)
    if (percentFixed > BigInt(0)) {
      const priceWei = parseUnits(String(price || '0'), decimals)
      percentFeeWei = (priceWei * percentFixed) / PERCENT_BASE
    }
  } catch (error) {
    console.error('[consumeMarketFee] Failed to compute percent fee', error)
  }

  const totalFeeWei = (orderFeeBigInt + percentFeeWei).toString()

  return {
    totalFeeWei,
    orderFeeWei: orderFeeBigInt.toString(),
    percentFeeWei: percentFeeWei.toString()
  }
}
