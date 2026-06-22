import {
  AbstractSigner,
  hexlify,
  JsonRpcProvider,
  verifyMessage,
  type Provider,
  type TransactionResponse,
  type TransactionRequest
} from 'ethers'
import { getAddress, type Address, type Chain, type Hex } from 'viem'
import {
  sendSignerServerTransaction,
  signSignerServerMessage
} from './signerServerApi'

export type SignerServerEoaSignerInit = {
  address: Address
  chainId: number
  provider: JsonRpcProvider
  chainsById: ReadonlyMap<number, Chain>
}

function buildProvider(chain: Chain): JsonRpcProvider {
  return new JsonRpcProvider(chain.rpcUrls.default.http[0], {
    chainId: chain.id,
    name: chain.name
  })
}

function toStringValue(value: TransactionRequest[keyof TransactionRequest]) {
  if (value === null || typeof value === 'undefined') return undefined
  return value.toString()
}

function toHexData(value: TransactionRequest[keyof TransactionRequest]) {
  if (value === null || typeof value === 'undefined') return '0x'
  return value.toString() as Hex
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForTransactionResponse(
  provider: JsonRpcProvider,
  hash: Hex
): Promise<TransactionResponse> {
  const deadline = Date.now() + 120_000

  while (Date.now() < deadline) {
    const transaction = await provider.getTransaction(hash)
    if (transaction) return transaction

    await sleep(1000)
  }

  throw new Error(`Signer server transaction ${hash} was not found.`)
}

let activeSignerServerEoaSigner: SignerServerEoaSigner | undefined
const activeSignerListeners = new Set<() => void>()

export function setActiveSignerServerEoaSigner(
  signer: SignerServerEoaSigner | undefined
) {
  activeSignerServerEoaSigner = signer
  activeSignerListeners.forEach((listener) => listener())
}

export function getActiveSignerServerEoaSigner() {
  return activeSignerServerEoaSigner
}

export function subscribeToActiveSignerServerEoaSigner(listener: () => void) {
  activeSignerListeners.add(listener)
  return () => {
    activeSignerListeners.delete(listener)
  }
}

export class SignerServerEoaSigner extends AbstractSigner<JsonRpcProvider> {
  readonly address: Address

  private readonly chain: Chain
  private readonly chainsById: ReadonlyMap<number, Chain>

  constructor(init: SignerServerEoaSignerInit) {
    super(init.provider)

    const chain = init.chainsById.get(init.chainId)
    if (!chain) {
      throw new Error(`Missing viem Chain for chainId ${init.chainId}.`)
    }

    this.address = getAddress(init.address)
    this.chain = chain
    this.chainsById = init.chainsById
  }

  static createForChain(input: {
    address: Address
    chainId: number
    chainsById: ReadonlyMap<number, Chain>
  }) {
    const chain = input.chainsById.get(input.chainId)
    if (!chain) {
      throw new Error(`Missing viem Chain for chainId ${input.chainId}.`)
    }

    return new SignerServerEoaSigner({
      ...input,
      provider: buildProvider(chain)
    })
  }

  getChainId(): number {
    return this.chain.id
  }

  getChain(): Chain {
    return this.chain
  }

  hasWalletForChain(chainId: number): boolean {
    return this.chainsById.has(chainId)
  }

  getSupportedChainIds(): number[] {
    return Array.from(this.chainsById.keys())
  }

  createSignerForChain(nextChainId: number): SignerServerEoaSigner {
    if (nextChainId === this.chain.id) return this

    return SignerServerEoaSigner.createForChain({
      address: this.address,
      chainId: nextChainId,
      chainsById: this.chainsById
    })
  }

  connect(provider: null | Provider): SignerServerEoaSigner {
    if (!(provider instanceof JsonRpcProvider)) {
      throw new Error('SignerServerEoaSigner requires a JsonRpcProvider.')
    }

    return new SignerServerEoaSigner({
      address: this.address,
      chainId: this.chain.id,
      provider,
      chainsById: this.chainsById
    })
  }

  async getAddress(): Promise<string> {
    return this.address
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    const signature = await signSignerServerMessage(
      typeof message === 'string'
        ? { message }
        : { rawMessage: hexlify(message) as Hex }
    )
    const recoveredAddress = getAddress(verifyMessage(message, signature))

    if (recoveredAddress !== this.address) {
      throw new Error(
        `Signer server returned a signature for ${recoveredAddress}, expected ${this.address}.`
      )
    }

    return signature
  }

  async signTransaction(): Promise<string> {
    throw new Error('Signer server signs and sends transactions server-side.')
  }

  async signTypedData(): Promise<string> {
    throw new Error('Signer server does not support typed data signing.')
  }

  async sendTransaction(tx: TransactionRequest) {
    const populated = await this.populateTransaction(tx)
    if (!populated.to) {
      throw new Error('Signer server transaction requires a recipient.')
    }

    const result = await sendSignerServerTransaction({
      chainId: this.chain.id,
      to: getAddress(populated.to.toString()),
      value: toStringValue(populated.value) || '0',
      data: toHexData(populated.data)
    })

    return waitForTransactionResponse(this.provider, result.hash)
  }
}
