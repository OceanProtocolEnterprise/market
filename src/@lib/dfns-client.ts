// @lib/dfns-client.ts
import { DFNS_CONFIG } from './dfns'

export interface Wallet {
  id: string
  name: string
  address: string
  network: string
  blockchain: string
  status: 'active' | 'inactive'
  createdAt: string
}

export interface WalletBalance {
  asset: string
  amount: string
  decimals: number
  usdValue?: string
}

export interface TransactionRequest {
  to: string
  amount: string
  asset: string
  note?: string
  gasLimit?: string
  gasPrice?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
}

export interface Transaction {
  id: string
  walletId: string
  status: 'pending' | 'signed' | 'broadcasted' | 'confirmed' | 'failed'
  type: string
  hash?: string
  from: string
  to: string
  amount: string
  asset: string
  fee?: string
  createdAt: string
  broadcastedAt?: string
  confirmedAt?: string
}

export class DfnsClient {
  private baseUrl: string
  private getAuthToken: () => Promise<string | null>

  constructor(getAuthToken: () => Promise<string | null>) {
    this.baseUrl = DFNS_CONFIG.baseUrl
    this.getAuthToken = getAuthToken
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken()
    if (!token) {
      throw new Error('No authentication token available')
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || `API request failed: ${response.status}`)
    }

    return response.json()
  }

  // ============ User & Permissions APIs ============

  async getCurrentUser(): Promise<any> {
    return this.request('/auth/userinfo')
  }

  async getUserPermissions(): Promise<string[]> {
    const user = await this.getCurrentUser()
    return user.permissions || []
  }

  async checkPermission(resource: string, action: string): Promise<boolean> {
    const permissions = await this.getUserPermissions()
    return permissions.some((p) => p.includes(`${resource}:${action}`))
  }

  // ============ Wallet APIs ============

  async listWallets(): Promise<{ wallets: Wallet[] }> {
    return this.request('/wallets')
  }

  async getWallet(walletId: string): Promise<Wallet> {
    return this.request(`/wallets/${walletId}`)
  }

  async getWalletBalances(
    walletId: string
  ): Promise<{ balances: WalletBalance[] }> {
    return this.request(`/wallets/${walletId}/balances`)
  }

  async getWalletBalanceByAsset(
    walletId: string,
    asset: string
  ): Promise<WalletBalance> {
    return this.request(`/wallets/${walletId}/balances/${asset}`)
  }

  // ============ Transaction APIs ============

  async createTransfer(
    walletId: string,
    params: TransactionRequest
  ): Promise<{ transaction: Transaction }> {
    // For Ethereum Sepolia, we need to handle gas parameters
    const body: any = {
      to: params.to,
      amount: params.amount,
      asset: params.asset,
      note: params.note
    }

    // Add gas parameters if provided
    if (params.gasLimit) body.gasLimit = params.gasLimit
    if (params.gasPrice) body.gasPrice = params.gasPrice
    if (params.maxFeePerGas) body.maxFeePerGas = params.maxFeePerGas
    if (params.maxPriorityFeePerGas)
      body.maxPriorityFeePerGas = params.maxPriorityFeePerGas

    return this.request(`/wallets/${walletId}/transfers`, {
      method: 'POST',
      body: JSON.stringify(body)
    })
  }

  async signTransaction(
    walletId: string,
    transactionId: string,
    passkeyCredId?: string
  ): Promise<{ signedTransaction: string }> {
    const body: any = {
      signer: {
        type: 'passkey' // Dfns uses passkey for signing
      }
    }

    if (passkeyCredId) {
      body.signer.credId = passkeyCredId
    }

    return this.request(
      `/wallets/${walletId}/transactions/${transactionId}/sign`,
      {
        method: 'POST',
        body: JSON.stringify(body)
      }
    )
  }

  async broadcastTransaction(
    walletId: string,
    transactionId: string
  ): Promise<{ transaction: Transaction }> {
    return this.request(
      `/wallets/${walletId}/transactions/${transactionId}/broadcast`,
      {
        method: 'POST'
      }
    )
  }

  async getTransaction(
    walletId: string,
    transactionId: string
  ): Promise<Transaction> {
    return this.request(`/wallets/${walletId}/transactions/${transactionId}`)
  }

  async listTransactions(
    walletId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ transactions: Transaction[] }> {
    return this.request(
      `/wallets/${walletId}/transactions?limit=${limit}&offset=${offset}`
    )
  }

  // ============ Passkey Management APIs ============

  async listPasskeys(): Promise<{ passkeys: any[] }> {
    return this.request('/auth/passkeys')
  }

  async registerPasskey(challenge: string, attestation: any): Promise<any> {
    return this.request('/auth/passkeys', {
      method: 'POST',
      body: JSON.stringify({
        challenge,
        attestation
      })
    })
  }

  async createPasskeyChallenge(): Promise<{ challenge: string }> {
    return this.request('/auth/passkeys/challenge', {
      method: 'POST'
    })
  }

  // ============ Advanced Transaction APIs ============

  async estimateGas(
    walletId: string,
    params: {
      to: string
      amount: string
      asset: string
      from?: string
      data?: string
    }
  ): Promise<{ gasLimit: string; gasPrice: string }> {
    return this.request(`/wallets/${walletId}/transfers/estimate`, {
      method: 'POST',
      body: JSON.stringify(params)
    })
  }

  async getTransactionReceipt(transactionHash: string): Promise<any> {
    return this.request(`/transactions/${transactionHash}/receipt`)
  }

  // ============ Helper Methods ============

  async waitForTransactionConfirmation(
    walletId: string,
    transactionId: string,
    maxAttempts: number = 30,
    intervalMs: number = 2000
  ): Promise<Transaction> {
    for (let i = 0; i < maxAttempts; i++) {
      const tx = await this.getTransaction(walletId, transactionId)
      if (tx.status === 'confirmed' || tx.status === 'failed') {
        return tx
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
    throw new Error('Transaction confirmation timeout')
  }
}
