import { LanguageValueObject } from 'src/@types/ddo/LanguageValueObject'

export function createLanguageValueObject(
  value: string,
  language?: string,
  direction?: string
): LanguageValueObject {
  return {
    '@value': value,
    '@language': language?.trim() || 'en',
    '@direction': direction?.toLowerCase() === 'rtl' ? 'rtl' : 'ltr'
  }
}
