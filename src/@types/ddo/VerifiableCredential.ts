import { AdditionalVerifiableCredentials } from './AdditionalVerifiableCredentials'
import { CredentialSubject } from './CredentialSubject'
import { Proof } from './Proof'

export interface VerifiableCredential {
  '@context': string[]
  id?: string
  type: string[]
  credentialSubject: CredentialSubject
  issuer: string
  version: string
  proof: Proof
  additionalDdos?: AdditionalVerifiableCredentials[]
}
