import { ReactElement } from 'react'
import styles from './index.module.css'

interface PriceDisplayProps {
  value: string | number
  symbol?: string
  duration?: string
  valueType?: 'escrow' | 'deposit' | 'default'
  displayValue?: string
  valueParts?: Array<{ value: string; symbol: string }>
}

export default function PriceDisplay({
  value,
  symbol = '',
  duration,
  valueType = 'default',
  displayValue,
  valueParts
}: PriceDisplayProps): ReactElement {
  const numericValue = Number(value)
  const formattedValue = displayValue ?? Number(value).toFixed(3)
  const hasValueParts = Boolean(valueParts && valueParts.length > 0)

  let colorClass = ''
  if (valueType === 'escrow' && numericValue !== 0) {
    colorClass = 'greenValue'
  } else if (valueType === 'deposit' && numericValue !== 0) {
    colorClass = 'redValue'
  }

  return (
    <div className={styles.priceInfo}>
      <span className={styles.price}>
        {hasValueParts ? (
          valueParts.map((part, index) => (
            <span
              key={`${part.symbol}-${index}`}
              className={styles.pricePairWrap}
            >
              {index > 0 && <span className={styles.priceSeparator}> & </span>}
              <span className={styles.pricePair}>
                <span
                  className={`${styles.priceNumber} ${
                    styles[colorClass] || ''
                  } ${styles.pricePairNumber}`}
                >
                  {part.value}
                </span>
                <span
                  className={`${styles.priceSymbol} ${styles.pricePairSymbol}`}
                >
                  {part.symbol}
                </span>
              </span>
            </span>
          ))
        ) : (
          <span className={styles.pricePair}>
            <span
              className={`${styles.priceNumber} ${styles[colorClass] || ''} ${
                styles.pricePairNumber
              }`}
            >
              {formattedValue}
            </span>
            {!displayValue && (
              <span
                className={`${styles.priceSymbol} ${styles.pricePairSymbol}`}
              >
                {symbol}
              </span>
            )}
          </span>
        )}
      </span>
      {duration && (
        <span className={styles.duration}>
          for {duration === '0s' ? 'forever' : duration}
        </span>
      )}
    </div>
  )
}
