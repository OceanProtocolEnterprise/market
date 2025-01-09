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
  request_credentials: RequestCredential[]
  vp_policies: VP[]
  vc_policies: VC[]
  custom_policies: string[]
}

export interface VPValue {
  policy: string
  args: number
}

type VC = string
type VP = string | VPValue

export interface RequestCredential {
  type: string
  format: string
  policies: string[]
}
