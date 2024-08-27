import { ReactElement } from 'react'
import NumberUnit from './NumberUnit'
import styles from './Stats.module.css'
import { useProfile } from '@context/Profile'
import formatRevenue from '../utils'

export default function Stats(): ReactElement {
  const { assetsTotal, sales, revenue } = useProfile()
  const formattedRevenue = formatRevenue(revenue)

  return (
    <div className={styles.stats}>
      <NumberUnit
        label={`Sale${sales === 1 ? '' : 's'}`}
        value={sales < 0 ? 0 : sales}
      />
      <NumberUnit label="Published" value={assetsTotal} />
      <NumberUnit label="Revenue" value={formattedRevenue} />
    </div>
  )
}
