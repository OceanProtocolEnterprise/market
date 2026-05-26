import { DfnsApiClient, DfnsAuthenticator } from '@dfns/sdk'
import { WebAuthnSigner } from '@dfns/sdk-browser'
import { DfnsWallet } from '@dfns/lib-viem'
import {
  type Address,
  type Chain,
  type Hex,
  createWalletClient,
  fromHex,
  getAddress,
  http,
  numberToHex
} from 'viem'
import { toAccount } from 'viem/accounts'
import { createConnector } from 'wagmi'
import { UserRejectedRequestError } from 'viem'
import { getRuntimeConfig } from '../runtimeConfig'

type DfnsProvider = {
  request(args: { method: string; params?: unknown }): Promise<unknown>
  on(event: string, listener: (...args: unknown[]) => void): void
  removeListener(event: string, listener: (...args: unknown[]) => void): void
}

type DfnsConnectParameters = {
  chainId?: number
  isReconnecting?: boolean
  username?: string
}

const DFNS_CONNECTOR_ID = 'dfns'

function getDfnsConfig() {
  const runtimeConfig = getRuntimeConfig()

  return {
    apiUrl: runtimeConfig.NEXT_PUBLIC_DFNS_API_URL,
    orgId: runtimeConfig.NEXT_PUBLIC_DFNS_ORG_ID,
    relyingPartyId: runtimeConfig.NEXT_PUBLIC_DFNS_RP_ID,
    walletId: runtimeConfig.NEXT_PUBLIC_DFNS_WALLET_ID
  }
}

function assertDfnsConfig() {
  const config = getDfnsConfig()
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length) {
    throw new Error(`Missing Dfns configuration: ${missing.join(', ')}`)
  }

  return config as Required<ReturnType<typeof getDfnsConfig>>
}

function getDefaultUsername(username?: string) {
  if (username) return username
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem('dfns_username') || ''
}

function promptForUsername(username?: string) {
  const defaultUsername = getDefaultUsername(username)
  if (defaultUsername) return defaultUsername

  const promptedUsername = window.prompt('Dfns account email')
  if (!promptedUsername) {
    throw new UserRejectedRequestError(new Error('Dfns login cancelled.'))
  }

  return promptedUsername.trim()
}

async function rpcRequest(
  chain: Chain,
  method: string,
  params: unknown
): Promise<unknown> {
  const url = chain.rpcUrls.default.http[0]
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: Date.now(),
      jsonrpc: '2.0',
      method,
      params: params ?? []
    })
  })
  const data = await response.json()

  if (data.error) {
    throw new Error(data.error.message || `RPC request failed: ${method}`)
  }

  return data.result
}

function isHex(value: unknown): value is Hex {
  return typeof value === 'string' && /^0x[0-9a-fA-F]*$/.test(value)
}

export function dfnsConnector() {
  let connected = false
  let account: Address | undefined
  let chainId: number | undefined
  let provider: DfnsProvider | undefined

  return createConnector<DfnsProvider>((config) => ({
    id: DFNS_CONNECTOR_ID,
    name: 'Dfns Passkey',
    type: DFNS_CONNECTOR_ID,
    async connect(parameters?: DfnsConnectParameters) {
      const chain =
        config.chains.find((item) => item.id === parameters?.chainId) ??
        config.chains[0]
      const dfnsConfig = assertDfnsConfig()
      const username = promptForUsername(parameters?.username)

      const signer = new WebAuthnSigner({
        relyingParty: {
          id: dfnsConfig.relyingPartyId,
          name: 'Ocean Enterprise Marketplace'
        }
      })
      const authenticator = new DfnsAuthenticator({
        baseUrl: dfnsConfig.apiUrl,
        signer
      })
      const { token } = await authenticator.login({
        orgId: dfnsConfig.orgId,
        username
      })
      const dfnsClient = new DfnsApiClient({
        baseUrl: dfnsConfig.apiUrl,
        authToken: token,
        signer
      })
      const dfnsWallet = await DfnsWallet.init({
        walletId: dfnsConfig.walletId,
        dfnsClient
      })
      const walletClient = createWalletClient({
        account: toAccount(dfnsWallet),
        chain,
        transport: http(chain.rpcUrls.default.http[0])
      })

      account = getAddress(dfnsWallet.address)
      chainId = chain.id
      connected = true
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('dfns_username', username)
      }

      provider = {
        async request({ method, params }) {
          if (method === 'eth_chainId') return numberToHex(chainId!)
          if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
            return account ? [account] : []
          }
          if (method === 'personal_sign' || method === 'eth_sign') {
            const [message] = (params as [string, string]) || []
            return walletClient.signMessage({
              account,
              message: isHex(message) ? { raw: message } : message
            })
          }
          if (method === 'eth_sendTransaction') {
            const [tx] = (params as [Record<string, Hex>]) || []
            return walletClient.sendTransaction({
              account,
              to: tx.to,
              value: tx.value ? BigInt(tx.value) : undefined,
              data: tx.data || '0x',
              gas: tx.gas ? BigInt(tx.gas) : undefined,
              gasPrice: tx.gasPrice ? BigInt(tx.gasPrice) : undefined,
              maxFeePerGas: tx.maxFeePerGas
                ? BigInt(tx.maxFeePerGas)
                : undefined,
              maxPriorityFeePerGas: tx.maxPriorityFeePerGas
                ? BigInt(tx.maxPriorityFeePerGas)
                : undefined,
              nonce: tx.nonce ? fromHex(tx.nonce, 'number') : undefined
            } as any)
          }
          if (method === 'wallet_switchEthereumChain') {
            const [{ chainId: nextChainId }] =
              (params as [{ chainId: Hex }]) || []
            const nextChain = config.chains.find(
              (item) => item.id === fromHex(nextChainId, 'number')
            )
            if (!nextChain) throw new Error('Unsupported chain')
            chainId = nextChain.id
            config.emitter.emit('change', { chainId })
            return null
          }

          return rpcRequest(chain, method, params)
        },
        on() {},
        removeListener() {}
      }

      config.emitter.emit('connect', { accounts: [account], chainId })

      return { accounts: [account], chainId }
    },
    async disconnect() {
      connected = false
      account = undefined
      chainId = undefined
      provider = undefined
      config.emitter.emit('disconnect')
    },
    async getAccounts() {
      return account ? [account] : []
    },
    async getChainId() {
      return chainId ?? config.chains[0].id
    },
    async getProvider() {
      if (!provider) throw new Error('Dfns wallet is not connected')
      return provider
    },
    async isAuthorized() {
      return connected && Boolean(account)
    },
    async switchChain({ chainId: nextChainId }) {
      const chain = config.chains.find((item) => item.id === nextChainId)
      if (!chain) throw new Error('Unsupported chain')
      chainId = chain.id
      config.emitter.emit('change', { chainId })
      return chain
    },
    onAccountsChanged(accounts) {
      account = accounts[0] ? getAddress(accounts[0]) : undefined
      if (!account) this.onDisconnect()
      else config.emitter.emit('change', { accounts: [account] })
    },
    onChainChanged(nextChainId) {
      chainId = Number(nextChainId)
      config.emitter.emit('change', { chainId })
    },
    onDisconnect() {
      connected = false
      account = undefined
      config.emitter.emit('disconnect')
    }
  }))
}
