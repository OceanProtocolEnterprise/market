import type { KeyValuePair } from 'src/@types/KeyValuePair'

export function convertLinks(link: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  link?.forEach((url, index) => {
    result[`link_${index + 1}`] = url
  })
  return result
}

// `metadata.links` is a title -> URL map. The KeyValueInput form control works
// with an ordered array of { key, value } pairs, so we convert between the two
// shapes when reading from / writing to the DDO.
export function recordToKeyValuePairs(
  record?: Record<string, string>
): KeyValuePair[] {
  if (!record) return []
  return Object.entries(record)
    .filter(([key, value]) => key?.trim() && value?.trim())
    .map(([key, value]) => ({ key, value }))
}

export function keyValuePairsToRecord(
  pairs?: KeyValuePair[]
): Record<string, string> {
  const result: Record<string, string> = {}
  pairs?.forEach(({ key, value }) => {
    const trimmedKey = key?.trim()
    const trimmedValue = value?.trim()
    if (trimmedKey && trimmedValue) {
      result[trimmedKey] = trimmedValue
    }
  })
  return result
}
