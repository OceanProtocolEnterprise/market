export interface RequestCredentialForm {
  type: string
  format: string
  policies?: PolicyType[]
  newPolicyType?: string
}

export type PolicyType =
  | StaticPolicy
  | ParameterizedPolicy
  | CustomUrlPolicy
  | CustomPolicy

export interface StaticPolicy {
  type: 'staticPolicy'
  name: string
}

export interface ParameterizedPolicy {
  type: 'parameterizedPolicy'
  policy: string
  args: string[]
}

export interface PolicyArgument {
  name: string
  value: string
}

export interface CustomUrlPolicy {
  type: 'customUrlPolicy'
  name: string
  policyUrl: string
  arguments: PolicyArgument[]
}

export interface CustomPolicy {
  type: 'customPolicy'
  name: string
  rules: PolicyRule[]
  arguments: PolicyArgument[]
}

export const PolicyRuleLeftValuePrefix: string = 'input.parameter'
export const PolicyRuleRightValuePrefix: string =
  'input.credentialData.credentialSubject'

export interface PolicyRule {
  leftValue: string
  rightValue: string
  operator: string
}

export interface StaticVpPolicy {
  type: 'staticVpPolicy'
  name: string
}

export interface ArgumentVpPolicy {
  type: 'argumentVpPolicy'
  policy: string
  args: string
}

export type VpPolicyType = StaticVpPolicy | ArgumentVpPolicy

export interface CredentialForm {
  allow?: string[]
  deny?: string[]
  requestCredentials?: RequestCredentialForm[]
  vpPolicies?: VpPolicyType[]
  vcPolicies?: string[]
}

export interface PolicyEditorProps {
  credentials: CredentialForm
  setCredentials: (CredentialForm) => void
  label: string
  name: string
  help: string
  defaultPolicies?: string[]
}
