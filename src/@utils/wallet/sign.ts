import { ethers, Signer, Signature } from 'ethers'
import { Proof } from 'src/@types/ddo/Proof'
import base64url from 'base64url'

function generateJwk(
  address: string,
  data: string,
  signature: Signature,
  base64Encoding: boolean
): string {
  const messageHash = ethers.utils.hashMessage(data)
  const publicKey = ethers.utils.recoverPublicKey(messageHash, signature)

  const publicKeyBytes = ethers.utils.arrayify(publicKey).slice(1) // Erster Byte entfernen (Punktkompression)
  const x = publicKeyBytes.slice(0, 32)
  const y = publicKeyBytes.slice(32)

  const jwk = {
    kty: 'EC',
    crv: 'secp256k1',
    x: base64url(Buffer.from(x)),
    y: base64url(Buffer.from(y)),
    alg: 'ES256K',
    use: 'sig',
    kid: base64url(address)
  }

  const jwkString = JSON.stringify(jwk)

  return base64Encoding ? base64url(jwkString) : jwkString
}

export async function signCredentialWithWeb3Wallet(
  signer: Signer,
  credential: any
): Promise<Proof> {
  const address: string = await signer.getAddress()
  const data: string = JSON.stringify(credential)
  const signedMessage: string = await signer.signMessage(data)

  const signature: Signature = ethers.utils.splitSignature(signedMessage)
  const { v } = signature

  // Ensure v is in the JWS-compatible range (27 or 28)
  const adjustedV: number = v < 27 ? v + 27 : v

  const header = {
    alg: 'ES256K',
    typ: 'JWT',
    kid: base64url(address)
  }
  const headerString: string = JSON.stringify(header)
  const headerBase64: string = base64url(headerString)
  const payloadBase64: string = base64url(data)

  // Convert ECDSA signature to DER format
  const derSignature: string = ethers.utils.joinSignature({
    ...signature,
    v: adjustedV
  })

  const jwk = generateJwk(address, data, signature, false)

  // Base64-url encode the signature
  const signatureBase64: string = base64url(derSignature)
  const proof: Proof = {
    type: 'JsonWebSignature2020',
    proofPurpose: 'assertionMethod',
    created: new Date(),
    verificationMethod: `did:jwk:${jwk}`,
    jws: `${headerBase64}.${payloadBase64}.${signatureBase64}`
  }

  return proof
}
