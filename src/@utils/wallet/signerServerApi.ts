import type { Address, Hex } from 'viem'

export type SignerServerNetwork = {
  chainId: number
  name?: string
}

export type SignerServerAddress = {
  walletId?: number
  address: Address
}

export type SignerServerTransactionResult = {
  hash: Hex
  from: Address
  to: Address | null
  nonce: number
}

export type SignerServerMessageInput = { message: string } | { rawMessage: Hex }

async function signerServerRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(`/api/signer-server/${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {})
    }
  })
  const data = (await response.json().catch(() => ({}))) as {
    error?: string
  }

  if (!response.ok) {
    throw new Error(data.error || 'Signer server request failed.')
  }

  return data as T
}

export async function getSignerServerNetworks() {
  const result = await signerServerRequest<{ networks: SignerServerNetwork[] }>(
    'available-networks'
  )

  return result.networks
}

export async function getSignerServerAddress() {
  return signerServerRequest<SignerServerAddress>('address')
}

export async function signSignerServerMessage(input: SignerServerMessageInput) {
  const result = await signerServerRequest<{ signature: Hex }>('sign-message', {
    method: 'POST',
    body: JSON.stringify(input)
  })

  return result.signature
}

export async function sendSignerServerTransaction(input: {
  chainId: number
  to: Address
  value?: string
  data?: Hex
}) {
  return signerServerRequest<SignerServerTransactionResult>(
    'send-transaction',
    {
      method: 'POST',
      body: JSON.stringify(input)
    }
  )
}
