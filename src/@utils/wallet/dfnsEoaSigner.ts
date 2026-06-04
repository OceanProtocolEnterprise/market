import type { DfnsApiClient } from '@dfns/sdk'
import { DfnsWallet } from '@dfns/lib-viem'
import {
  AbstractSigner,
  JsonRpcProvider,
  TypedDataEncoder,
  type Provider,
  type TransactionRequest,
  type TypedDataDomain,
  type TypedDataField
} from 'ethers'
import {
  type Address,
  type Chain,
  type Hex,
  type WalletClient,
  createWalletClient,
  getAddress,
  http
} from 'viem'
import { toAccount } from 'viem/accounts'

type DfnsWalletClient = WalletClient & {
  account: ReturnType<typeof toAccount>
}

export type DfnsEoaSignerInit = {
  address: Address
  chainId: number
  dfnsClient: DfnsApiClient
  dfnsWallet: DfnsWallet
  walletClient: DfnsWalletClient
  provider: JsonRpcProvider
  chainsById: ReadonlyMap<number, Chain>
  walletsByChain: ReadonlyMap<number, string>
}

function toBigIntValue(value: TransactionRequest[keyof TransactionRequest]) {
  if (value === null || typeof value === 'undefined') return undefined
  return BigInt(value.toString())
}

function toNumberValue(value: TransactionRequest[keyof TransactionRequest]) {
  if (value === null || typeof value === 'undefined') return undefined
  return Number(value)
}

function toHexValue(value: TransactionRequest[keyof TransactionRequest]) {
  if (value === null || typeof value === 'undefined') return undefined
  return value.toString() as Hex
}

function toViemDomain(domain: TypedDataDomain) {
  return {
    ...domain,
    chainId:
      typeof domain.chainId === 'undefined'
        ? undefined
        : BigInt(domain.chainId.toString())
  }
}

function buildProvider(chain: Chain): JsonRpcProvider {
  return new JsonRpcProvider(chain.rpcUrls.default.http[0], {
    chainId: chain.id,
    name: chain.name
  })
}

function buildWalletClient(
  chain: Chain,
  dfnsWallet: DfnsWallet
): DfnsWalletClient {
  return createWalletClient({
    account: toAccount(dfnsWallet),
    chain,
    transport: http(chain.rpcUrls.default.http[0])
  }) as DfnsWalletClient
}

let activeDfnsEoaSigner: DfnsEoaSigner | undefined
const activeSignerListeners = new Set<() => void>()

export function setActiveDfnsEoaSigner(signer: DfnsEoaSigner | undefined) {
  activeDfnsEoaSigner = signer
  activeSignerListeners.forEach((listener) => listener())
}

export function getActiveDfnsEoaSigner() {
  return activeDfnsEoaSigner
}

export function subscribeToActiveDfnsEoaSigner(listener: () => void) {
  activeSignerListeners.add(listener)
  return () => {
    activeSignerListeners.delete(listener)
  }
}

export class DfnsEoaSigner extends AbstractSigner<JsonRpcProvider> {
  readonly address: Address

  private readonly chain: Chain
  private readonly dfnsWallet: DfnsWallet
  private walletClient: DfnsWalletClient

  private readonly dfnsClient: DfnsApiClient
  private readonly chainsById: ReadonlyMap<number, Chain>
  private readonly walletsByChain: ReadonlyMap<number, string>

  constructor(init: DfnsEoaSignerInit) {
    super(init.provider)

    if (!init.walletsByChain.has(init.chainId)) {
      throw new Error(
        `DFNS chain ${init.chainId} is not supported by this account. ` +
          `Available: ${
            Array.from(init.walletsByChain.keys()).join(', ') || '(none)'
          }.`
      )
    }
    const chain = init.chainsById.get(init.chainId)
    if (!chain) {
      throw new Error(`Missing viem Chain for chainId ${init.chainId}.`)
    }

    this.address = init.address
    this.chain = chain
    this.dfnsWallet = init.dfnsWallet
    this.walletClient = init.walletClient
    this.dfnsClient = init.dfnsClient
    this.chainsById = init.chainsById
    this.walletsByChain = init.walletsByChain
  }

  /**
   * Resolves the DFNS wallet for a chainId, initialises the viem walletClient
   * and ethers JsonRpcProvider, and constructs a ready-to-use signer.
   * No WebAuthn / SSO prompt; DfnsWallet.init reads via the authenticated
   * dfnsClient.
   */
  static async createForChain(input: {
    chainId: number
    dfnsClient: DfnsApiClient
    chainsById: ReadonlyMap<number, Chain>
    walletsByChain: ReadonlyMap<number, string>
  }): Promise<DfnsEoaSigner> {
    const { chainId, dfnsClient, chainsById, walletsByChain } = input

    if (!walletsByChain.has(chainId)) {
      throw new Error(
        `No DFNS wallet provisioned for chain ${chainId}. ` +
          `Available: ${
            Array.from(walletsByChain.keys()).join(', ') || '(none)'
          }.`
      )
    }
    const chain = chainsById.get(chainId)
    if (!chain) {
      throw new Error(`Missing viem Chain for chainId ${chainId}.`)
    }

    const walletId = walletsByChain.get(chainId) as string
    const dfnsWallet = await DfnsWallet.init({ walletId, dfnsClient })
    const walletClient = buildWalletClient(chain, dfnsWallet)
    const provider = buildProvider(chain)

    return new DfnsEoaSigner({
      address: getAddress(dfnsWallet.address),
      chainId,
      dfnsClient,
      dfnsWallet,
      walletClient,
      provider,
      chainsById,
      walletsByChain
    })
  }

  getChainId(): number {
    return this.chain.id
  }

  getChain(): Chain {
    return this.chain
  }

  getSupportedChainIds(): readonly number[] {
    return Array.from(this.walletsByChain.keys())
  }

  hasWalletForChain(chainId: number): boolean {
    return this.walletsByChain.has(chainId)
  }

  getWalletClient(): DfnsWalletClient {
    return this.walletClient
  }

  async createSignerForChain(nextChainId: number): Promise<DfnsEoaSigner> {
    if (nextChainId === this.chain.id) return this
    if (!this.walletsByChain.has(nextChainId)) {
      throw new Error(`No DFNS wallet provisioned for chain ${nextChainId}.`)
    }

    return DfnsEoaSigner.createForChain({
      chainId: nextChainId,
      dfnsClient: this.dfnsClient,
      chainsById: this.chainsById,
      walletsByChain: this.walletsByChain
    })
  }

  /**
   * Re-binds the active DFNS signer to a different chain by:
   *  - resolving the per-chain DFNS walletId,
   *  - re-initialising DfnsWallet (no WebAuthn prompt; uses live SSO token),
   *  - rebuilding the viem walletClient,
   *  - rebuilding the ethers JsonRpcProvider.
   *
   * The new signer instance replaces the module-level active reference via
   * setActiveDfnsEoaSigner so subscribers (useEthersSigner) pick it up on the
   * next wagmi `change` event. External callers should not retain references
   * to the prior signer; they should always re-read via getActiveDfnsEoaSigner.
   */
  async setChainId(nextChainId: number): Promise<void> {
    const next = await this.createSignerForChain(nextChainId)
    if (next === this) return
    setActiveDfnsEoaSigner(next)
  }

  connect(provider: null | Provider): DfnsEoaSigner {
    if (!(provider instanceof JsonRpcProvider)) {
      throw new Error('DfnsEoaSigner requires a JsonRpcProvider.')
    }

    return new DfnsEoaSigner({
      address: this.address,
      chainId: this.chain.id,
      dfnsClient: this.dfnsClient,
      dfnsWallet: this.dfnsWallet,
      walletClient: this.walletClient,
      provider,
      chainsById: this.chainsById,
      walletsByChain: this.walletsByChain
    })
  }

  async getAddress(): Promise<string> {
    return this.address
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    return this.dfnsWallet.signMessage({
      message: typeof message === 'string' ? message : { raw: message }
    })
  }

  async signTransaction(tx: TransactionRequest): Promise<string> {
    const populated = await this.populateTransaction(tx)

    return this.dfnsWallet.signTransaction({
      to: populated.to as Hex | undefined,
      data: toHexValue(populated.data),
      value: toBigIntValue(populated.value),
      gas: toBigIntValue(populated.gasLimit),
      gasPrice: toBigIntValue(populated.gasPrice),
      maxFeePerGas: toBigIntValue(populated.maxFeePerGas),
      maxPriorityFeePerGas: toBigIntValue(populated.maxPriorityFeePerGas),
      nonce: toNumberValue(populated.nonce),
      chainId: toNumberValue(populated.chainId) ?? this.chain.id
    } as Parameters<typeof this.dfnsWallet.signTransaction>[0])
  }

  async sendTransaction(tx: TransactionRequest) {
    const signedTransaction = await this.signTransaction(tx)
    return this.provider.broadcastTransaction(signedTransaction)
  }

  async signTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, unknown>
  ): Promise<string> {
    return this.dfnsWallet.signTypedData({
      domain: toViemDomain(domain),
      types: types as Parameters<
        typeof this.dfnsWallet.signTypedData
      >[0]['types'],
      primaryType: TypedDataEncoder.getPrimaryType(types),
      message: value
    } as Parameters<typeof this.dfnsWallet.signTypedData>[0])
  }
}
