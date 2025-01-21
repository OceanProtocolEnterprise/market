import {
  CustomPolicy,
  CustomUrlPolicy,
  ParameterizedPolicy,
  PolicyArgument,
  PolicyRule,
  PolicyRuleLeftValuePrefix,
  PolicyRuleRightValuePrefix,
  PolicyType,
  StaticPolicy
} from './types'

function readProperties(data: any): PolicyArgument[] {
  const args: PolicyArgument[] = []
  Object.keys(data || {}).forEach((key) => {
    args.push({
      name: key,
      value: data[key]
    })
  })
  return args
}

function parseLine(line: string): PolicyRule {
  let elements = line.split(' ')
  elements = elements.filter((element) => element?.length > 0)

  if (elements.length !== 3) {
    return
  }

  return {
    leftValue: elements[0].replace(PolicyRuleLeftValuePrefix, ''),
    operator: elements[1],
    rightValue: elements[2].replace(PolicyRuleRightValuePrefix, '')
  }
}

function readRules(policy: string): PolicyRule[] {
  const policies: string[] = policy.split('\n')
  const rules: PolicyRule[] = []
  let startReading = false
  for (const line of policies) {
    if (line.replaceAll(' ', '').includes('main{')) {
      startReading = true
      continue
    }
    if (line.replaceAll(' ', '').includes('}')) {
      startReading = false
    }

    if (startReading) {
      rules.push(parseLine(line))
    }
  }

  return rules
}

export function convertToPolicyType(data: any): PolicyType {
  if (!data) {
    return
  }

  if (typeof data === 'string') {
    return {
      type: 'staticPolicy',
      name: data
    } as StaticPolicy
  }

  if (
    'policy' in data &&
    typeof data.policy === 'string' &&
    'args' in data &&
    Array.isArray(data.args)
  ) {
    return {
      type: 'parameterizedPolicy',
      policy: data.policy,
      args: data.args
    } as ParameterizedPolicy
  }

  if (
    'policyUrl' in data &&
    typeof data.policyUrl === 'string' &&
    'argument' in data &&
    typeof data.argument === 'object'
  ) {
    return {
      type: 'customUrlPolicy',
      policyUrl: data.policyUrl,
      arguments: readProperties(data.argument)
    } as CustomUrlPolicy
  }

  if (
    'name' in data &&
    typeof data.name === 'string' &&
    'description' in data &&
    typeof data.description === 'string' &&
    'policy' in data &&
    typeof data.policy === 'string' &&
    'argument' in data &&
    typeof data.argument === 'object'
  ) {
    return {
      type: 'customPolicy',
      name: data.name,
      description: data.description,
      rules: readRules(data.policy),
      arguments: readProperties(data.argument)
    } as CustomPolicy
  }

  throw new Error(
    `Type is not convertible to PolicyType: ${JSON.stringify(data)}`
  )
}
