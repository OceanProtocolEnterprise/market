export interface Credential {
  allow?: (CredentialAddressBased | CredentialPolicyBased)[]
  deny?: (CredentialAddressBased | CredentialPolicyBased)[]
}

export interface CredentialAddressBased {
  type: 'address'
  values: string[]
}

export interface CredentialPolicyBased {
  vpPolicies?: string[]
  vcPolicies?: string[]
  requestCredentials: RequestCredential[]
}

export interface RequestCredential {
  type: string
  format: string
  policies?: (string | Record<string, string | number | boolean>)[]
}
