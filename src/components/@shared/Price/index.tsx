import { ReactElement } from 'react'
import { AssetPrice } from '@oceanprotocol/lib'
import PriceUnit from './PriceUnit'

export default function Price({
  price,
  orderPriceAndFees,
  className,
  size
}: {
  price: AssetPrice
  orderPriceAndFees?: OrderPriceAndFees
  className?: string
  size?: 'small' | 'mini' | 'large'
}): ReactElement {
  if (!price && !orderPriceAndFees) return
  return (
    <PriceUnit
      price={Number(orderPriceAndFees?.price) || price?.value}
      symbol={price?.tokenSymbol}
      className={className}
      size={size}
    />
  )
}
