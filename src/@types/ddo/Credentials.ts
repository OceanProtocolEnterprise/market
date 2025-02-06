export interface Credential {
  match_allow?: 'any' | 'all'
  match_deny: 'any' | 'all'
  allow?: (CredentialAddressBased | CredentialPolicyBased)[]
  deny?: (CredentialAddressBased | CredentialPolicyBased)[]
}

export interface CredentialAddressBased {
  type: 'address'
  values: string[]
}

export interface CredentialPolicyBased {
  type: 'verifiableCredential'
  request_credentials: RequestCredential[]
  vp_policies: string[]
  vc_policies: string[]
  custom_policies: string[]
}

export interface RequestCredential {
  type: string
  format: string
  policies: string[]
}
