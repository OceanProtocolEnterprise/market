import { ethers, Signer, Signature } from 'ethers'
import { Proof } from 'src/@types/ddo/Proof'
import base64url from 'base64url'
import * as elliptic from 'elliptic'

async function generateSha256(data) {
  const encoder = new TextEncoder() // Kodiert Text als Uint8Array
  const dataBuffer = encoder.encode(data) // Erstelle den Datenpuffer

  // Berechne den SHA-256-Hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)

  // Konvertiere den Hash in ein lesbares Format (z. B. Hex)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

  return hashHex
}

function base64urlDecode(input: string): ArrayBuffer {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/').replace(/=/g, '') // Entferne '='-Zeichen
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer
}

async function verifyJwsSignature(
  message: string,
  signature: string,
  jwk: string
): Promise<boolean> {
  const ec = new elliptic.ec('secp256k1') // Initialisiere elliptische Kurve secp256k1

  // 1. Konvertiere JWK in den öffentlichen Schlüssel (extrahiere x, y)
  const publicKeyJwk = JSON.parse(jwk)
  const publicKey = ec.keyFromPublic({
    x: base64urlDecode(publicKeyJwk.x),
    y: base64urlDecode(publicKeyJwk.y)
  })

  // 2. Berechne den Hash der Nachricht (Ethereum spezifisches Präfix hinzufügen)
  const messageWithPrefix = `\x19Ethereum Signed Message:\n${message.length}${message}`
  const messageBuffer = Buffer.from(messageWithPrefix, 'utf-8')
  const messageHash = generateSha256(messageBuffer)

  // 3. Dekodiere die Signatur
  const sig = base64urlDecode(signature)

  // 4. Verifiziere die Signatur
  const isValid = publicKey.verify(messageHash, sig)

  return isValid
}

function generatePrivateJwkFromWeb3Signature(
  web3Address: string,
  data: string,
  signature: Signature,
  base64Encoding: boolean
): string {
  const messageHash = ethers.utils.hashMessage(data)
  const publicKey = ethers.utils.recoverPublicKey(messageHash, signature)

  const publicKeyBytes = ethers.utils.arrayify(publicKey).slice(1)
  const x = publicKeyBytes.slice(0, 32)
  const y = publicKeyBytes.slice(32)

  const privateKey: string =
    '0xc594c6e5def4bab63ac29eed19a134c130388f74f019bc74b8f4389df2837a58'
  const privateKeyBytes = ethers.utils.arrayify(privateKey)

  const privateJwk = {
    kty: 'EC',
    crv: 'secp256k1',
    x: base64url(Buffer.from(x)),
    y: base64url(Buffer.from(y)),
    d: base64url(Buffer.from(privateKeyBytes)),
    alg: 'ES256K',
    use: 'sig',
    kid: base64url(web3Address)
  }

  const privateJwkString = JSON.stringify(privateJwk)
  return base64Encoding ? base64url(privateJwkString) : privateJwkString
}

function generatePublicJwkFromWeb3Signature(
  web3Address: string,
  data: string,
  signature: Signature,
  base64Encoding: boolean
): string {
  const messageHash = ethers.utils.hashMessage(data)
  const publicKey = ethers.utils.recoverPublicKey(messageHash, signature)

  const publicKeyBytes = ethers.utils.arrayify(publicKey).slice(1)
  const x = publicKeyBytes.slice(0, 32)
  const y = publicKeyBytes.slice(32)

  const publicJwk = {
    kty: 'EC',
    crv: 'secp256k1',
    x: base64url(Buffer.from(x)),
    y: base64url(Buffer.from(y)),
    alg: 'ES256K',
    use: 'sig',
    kid: base64url(web3Address)
  }

  const publicJwkString = JSON.stringify(publicJwk)
  return base64Encoding ? base64url(publicJwkString) : publicJwkString
}

export async function signCredentialWithWeb3Wallet(
  signer: Signer,
  credential: any
): Promise<Proof> {
  const address: string = await signer.getAddress()
  const data: string = JSON.stringify(credential)

  const messageSignature: string = await signer.signMessage(data)
  const signature: Signature = ethers.utils.splitSignature(messageSignature)
  // const { v } = signature

  // Ensure v is in the JWS-compatible range (27 or 28)
  // const adjustedV: number = v < 27 ? v + 27 : v

  const header = {
    alg: 'ES256K',
    typ: 'JWT',
    kid: base64url(address)
  }
  const headerBase64: string = base64url(JSON.stringify(header))
  const payloadBase64: string = base64url(data)

  const messageSignatureBase64 = base64url(
    Buffer.from(signature.r.slice(2) + signature.s.slice(2), 'hex')
  ) // base64url(Buffer.from(messageSignatureBytes))

  const publicJwk = generatePublicJwkFromWeb3Signature(
    address,
    data,
    signature,
    false
  )
  console.log('publicJwk')
  console.log(publicJwk)

  const privateJwk = generatePrivateJwkFromWeb3Signature(
    address,
    data,
    signature,
    false
  )
  console.log('privateJwk')
  console.log(privateJwk)

  // Base64-url encode the signature
  // const signatureBase64: string = base64url(derSignature)
  const proof: Proof = {
    type: 'JsonWebSignature2020',
    proofPurpose: 'assertionMethod',
    created: new Date(),
    verificationMethod: `did:jwk:${publicJwk}`,
    jws: `${headerBase64}.${payloadBase64}.${messageSignatureBase64}`
  }

  console.log('signature')
  console.log(`${headerBase64}.${payloadBase64}.${messageSignatureBase64}`)
try {
  const result = await verifyJwsSignature(
    data,
    messageSignatureBase64,
    publicJwk
  )
  console.log('result')
  console.log(result)

} catch (error) {
  console.log(error)
}
  /*
  const messageHash = ethers.utils.hashMessage(data)
  const publicKey = ethers.utils.recoverPublicKey(messageHash, signature)
  const publicKeyBytes = ethers.utils.arrayify(publicKey).slice(1)
  console.log(Buffer.from(publicKeyBytes))
  const x = publicKeyBytes.slice(0, 32)
  const y = publicKeyBytes.slice(32)
  const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${base64url(
    Buffer.from(x)
  )}\n${base64url(Buffer.from(y))}\n-----END PUBLIC KEY-----`
  console.log(publicKeyPem)
  console.log('now')
*/
  return proof
}
