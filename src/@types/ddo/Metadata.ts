import { LanguageValueObject } from './LanguageValueObject'
import { License } from './License'
import { RemoteObject } from './RemoteObject'
import { Option } from './Option'

interface Container {
  entrypoint: string
  image: string
  tag: string
  checksum: string
}

export interface Algorithm {
  container: Container
  language?: string
  version?: string
  consumerParameters?: Record<string, string | number | boolean | Option[]>[]
}

export interface Metadata {
  created: string
  updated: string
  description: LanguageValueObject
  copyrightHolder: string
  name: string
  // symbol: string;
  displayTitle?: LanguageValueObject
  type: string
  author?: string
  providedBy: string
  license?: License
  links?: Record<string, string>
  attachments?: RemoteObject[]
  tags?: string[]
  categories?: string[]
  additionalInformation?: Record<string, string | number | boolean>
  // Required if asset type is algorithm
  algorithm?: Algorithm
}
