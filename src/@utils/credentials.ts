import {
  CredentialAddressBased,
  CredentialPolicyBased
} from 'src/@types/ddo/Credentials'

export function isCredentialAddressBased(
  credential: CredentialAddressBased | CredentialPolicyBased
): credential is CredentialAddressBased {
  return (
    (credential as CredentialAddressBased).type !== undefined &&
    (credential as CredentialAddressBased).type === 'address'
  )
}
