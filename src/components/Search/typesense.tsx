import { Filters } from '@context/Filter'

export function filterBy(f: Filters): string | undefined {
  const filterQueryPath = {
    accessType: 'services.type',
    serviceType: 'metadata.type',
    filterSet: 'metadata.tags.keyword'
  }
  let result = ''
  for (const [key, value] of Object.entries(f)) {
    if (value.length === 0) {
      continue
    }
    result += `${filterQueryPath[key]}:=[${value}] && `
  }

  return result.length > 1 ? result.substring(0, result.length - 4) : undefined
}
