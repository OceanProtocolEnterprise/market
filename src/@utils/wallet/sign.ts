import { SignedCredential } from '@oceanprotocol/lib/dist/types/@types/IssuerSignature'
import { Sign } from 'crypto'
import { addDays } from 'date-fns'
import { ethers, Signer, Signature } from 'ethers'

/**
 * Encodes a string into Base64-url format.
 * @param {string} input - The string to encode.
 * @returns {string} - The Base64-url encoded string.
 */
function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

/**
 * Signs a message using MetaMask and converts the signature into JWS format.
 * @param {Signer} signer
 * @param {string} data - The data to be signed.
 * @returns {Promise<string>} - The generated JWS as a string.
 */
export async function signCredentialWithWeb3Wallet(
  signer: Signer,
  credential: any
): Promise<SignedCredential> {
  const address: string = await signer.getAddress()
  const data = JSON.stringify(credential)
  const signedMessage: string = await signer.signMessage(data)

  const signature: Signature = ethers.utils.splitSignature(signedMessage)
  const { v } = signature

  // Ensure v is in the JWS-compatible range (27 or 28)
  const adjustedV: number = v < 27 ? v + 27 : v

  // JWS Header
  const header = {
    alg: 'ES256K', // ECDSA with secp256k1
    typ: 'JWT',
    kid: address // Optional: Ethereum address as Key ID
  }
  const headerBase64 = base64UrlEncode(JSON.stringify(header))

  // JWS Payload
  const payloadBase64: string = base64UrlEncode(data)

  // Convert ECDSA signature to DER format
  const derSignature: string = ethers.utils.joinSignature({
    ...signature,
    v: adjustedV
  })

  // Base64-url encode the signature
  const signatureBase64: string = base64UrlEncode(derSignature)

  const proof: SignedCredential = {
    header,
    issuer: address,
    jws: `${headerBase64}.${payloadBase64}.${signatureBase64}`
  }

  console.log(signatureBase64)

  return proof
}
