import { ReactElement } from 'react'
import PricingRow from './PricingRow'
import styles from './index.module.css'

interface RowItemProps {
  itemName: string
  value: string | number
  valueParts?: Array<{ value: string; symbol: string }>
  duration?: string
  valueType?: 'escrow' | 'deposit' | 'default'
  symbol?: string
  isValueLoading?: boolean
}

export default function RowItem({
  itemName,
  value,
  valueParts,
  duration,
  valueType,
  symbol,
  isValueLoading
}: RowItemProps): ReactElement {
  return (
    <PricingRow
      itemName={itemName}
      value={value}
      valueParts={valueParts}
      duration={duration}
      valueType={valueType}
      symbol={symbol}
      isValueLoading={isValueLoading}
      showLeader={true}
      className={styles.listRow}
    />
  )
}
