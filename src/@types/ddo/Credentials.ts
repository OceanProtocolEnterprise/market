export interface Credential {
  allow?: (CredentialAddressBased | CredentialPolicyBased)[]
  deny?: (CredentialAddressBased | CredentialPolicyBased)[]
}

export interface CredentialAddressBased {
  type: 'address'
  values: string[]
}

export interface CredentialPolicyBased {
  type: 'verifiableCredential'
  requestCredentials: RequestCredential[]
}

export type RequestCredential = string | DetailedCredential

export interface DetailedCredential {
  credential?: string
  policies?: Policy[]
}

export type Policy = string | PolicyDetail

export interface PolicyDetail {
  policy: string
  args: PolicyArgs
}

export interface PolicyArgs {
  type: string
}
