export default function formatRevenue(revenue: Revenue[]) {
  if (!revenue || revenue.length === 0) return '0'

  const formatted = revenue.map((item, index) => {
    return `${item.totalValue.value} ${item.key}`
  })

  if (formatted.length > 1) {
    const lastItem = formatted.pop()
    return `${formatted.join(', ')} & ${lastItem}`
  } else {
    return formatted[0]
  }
}
