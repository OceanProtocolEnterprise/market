import { ReactElement } from 'react'
import TableSkeleton from '@shared/atoms/Table/Skeleton'

// 7 cols: Algorithm | Network | Provider | Created | Finished | Status | Actions
const headerWidths = ['60%', '70%', '65%', '55%', '55%', '50%', '60%']
const rowWidths = [
  ['75%', '60%', '80%', '55%', '55%', '65%', '50%'],
  ['65%', '70%', '70%', '65%', '65%', '55%', '45%'],
  ['80%', '55%', '75%', '50%', '60%', '70%', '55%'],
  ['70%', '65%', '65%', '70%', '50%', '60%', '50%'],
  ['60%', '75%', '80%', '60%', '55%', '65%', '45%']
]

export default function ComputeJobsSkeleton(): ReactElement {
  return (
    <TableSkeleton
      gridTemplateColumns="2fr 1fr 1.5fr 1fr 1fr 1fr 0.8fr"
      headerWidths={headerWidths}
      rowWidths={rowWidths}
    />
  )
}
