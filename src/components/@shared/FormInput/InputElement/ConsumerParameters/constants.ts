import { FormConsumerParameter } from '@components/Publish/_types'

export const defaultConsumerParam: FormConsumerParameter = {
  name: '',
  label: '',
  description: '',
  type: 'text',
  options: undefined,
  default: '',
  required: 'optional'
}

export const paramTypes: FormConsumerParameter['type'][] = [
  'number',
  'text',
  'boolean',
  'select'
]
