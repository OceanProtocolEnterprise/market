import type { DfnsWallet } from '@dfns/lib-viem'
import {
  AbstractSigner,
  JsonRpcProvider,
  TypedDataEncoder,
  type Provider,
  type TransactionRequest,
  type TypedDataDomain,
  type TypedDataField
} from 'ethers'
import type { Chain, Hex, WalletClient } from 'viem'
import { toAccount } from 'viem/accounts'

type DfnsWalletClient = WalletClient & {
  account: ReturnType<typeof toAccount>
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

export class DfnsEoaSigner extends AbstractSigner<JsonRpcProvider> {
  readonly address: string
  private readonly chain: Chain
  private readonly dfnsWallet: DfnsWallet
  private readonly walletClient: DfnsWalletClient

  constructor({
    address,
    chain,
    dfnsWallet,
    provider,
    walletClient
  }: {
    address: string
    chain: Chain
    dfnsWallet: DfnsWallet
    provider: JsonRpcProvider
    walletClient: DfnsWalletClient
  }) {
    super(provider)
    this.address = address
    this.chain = chain
    this.dfnsWallet = dfnsWallet
    this.walletClient = walletClient
  }

  connect(provider: null | Provider): DfnsEoaSigner {
    if (!(provider instanceof JsonRpcProvider)) {
      throw new Error('DfnsEoaSigner requires a JsonRpcProvider.')
    }

    return new DfnsEoaSigner({
      address: this.address,
      chain: this.chain,
      dfnsWallet: this.dfnsWallet,
      provider,
      walletClient: this.walletClient
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

let activeDfnsEoaSigner: DfnsEoaSigner | undefined

export function setActiveDfnsEoaSigner(signer: DfnsEoaSigner | undefined) {
  activeDfnsEoaSigner = signer
}

export function getActiveDfnsEoaSigner() {
  return activeDfnsEoaSigner
}
