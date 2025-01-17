export interface RequestCredentialForm {
  type: string
  format: string
  policies?: PolicyType[]
}

export type PolicyType =
  | StaticPolicyForm
  | ParameterizedPolicyForm
  | CustomUrlPolicy
  | CustomPolicy

export interface StaticPolicyForm {
  type: 'staticPolicy'
  name: string
}

export interface ParameterizedPolicyForm {
  type: 'parameterizedPolicy'
  policy: string
  args: string[]
}

export interface CustomUrlPolicy {
  type: 'customUrlPolicy'
  policyUrl: string
  arguments: Record<string, string>
}

export interface CustomPolicy {
  type: 'customPolicy'
  name: string
  description: string
  rules: PolicyRule[]
  arguments: Record<string, string>
}

export interface PolicyRule {
  leftValue: string
  rightValue: string
  operator: string
}

export interface CredentialForm {
  allow?: string[]
  deny?: string[]
  requestCredentials?: RequestCredentialForm[]
  vpPolicies?: string[]
  vcPolicies?: string[]
}

export interface PolicyEditorProps {
  credentials: CredentialForm
  setCredentials: (CredentialForm) => void
  label: string
  name: string
  defaultPolicies?: string[]
}
