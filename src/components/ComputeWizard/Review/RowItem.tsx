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
}

export default function RowItem({
  itemName,
  value,
  valueParts,
  duration,
  valueType,
  symbol
}: RowItemProps): ReactElement {
  return (
    <PricingRow
      itemName={itemName}
      value={value}
      valueParts={valueParts}
      duration={duration}
      valueType={valueType}
      symbol={symbol}
      showLeader={true}
      className={styles.listRow}
    />
  )
}
