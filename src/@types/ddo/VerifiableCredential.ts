import { AdditionalVerifiableCredentials } from './AdditionalVerifiableCredentials'
import { CredentialSubject } from './CredentialSubject'

export interface Credential {
  type: string[]
  '@context': string[]
  id: string
  credentialSubject: CredentialSubject
  issuer: string
  version: string
  additionalDdos?: AdditionalVerifiableCredentials[]
}

/**
 * A credential that is verifiable.
 * @see https://www.w3.org/TR/vc-data-model
 */
/**
 * A verifiable credential may use the `external proof` mechanism to JWT usage, in which case the `proof` field is not embedded.
 * @see https://www.w3.org/TR/vc-data-model/#proofs-signatures
 */
export interface VerifiableCredentialJWT extends Credential {
  iss: Credential['issuer']
  exp?: number
  nbf?: number
  jti?: string
  sub?: string
}
