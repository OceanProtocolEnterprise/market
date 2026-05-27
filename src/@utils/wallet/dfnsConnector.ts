import { DfnsApiClient, DfnsAuthenticator, DfnsError } from '@dfns/sdk'
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
import { JsonRpcProvider } from 'ethers'
import { getNodeUriMap, getRuntimeConfig } from '../runtimeConfig'
import { getSupportedChains } from './chains'
import { DfnsEoaSigner, setActiveDfnsEoaSigner } from './dfnsEoaSigner'

type DfnsProvider = {
  request(args: { method: string; params?: unknown }): Promise<unknown>
  on(event: string, listener: (...args: unknown[]) => void): void
  removeListener(event: string, listener: (...args: unknown[]) => void): void
}

type DfnsConnectParameters<withCapabilities extends boolean = false> = {
  chainId?: number
  isReconnecting?: boolean
  organizationId?: string
  withCapabilities?: withCapabilities | boolean
  username?: string
}

type DfnsConnectReturn<withCapabilities extends boolean = false> = {
  accounts: withCapabilities extends true
    ? readonly { address: Address; capabilities: Record<string, unknown> }[]
    : readonly Address[]
  chainId: number
}

const DFNS_CONNECTOR_ID = 'dfns'

function getDfnsConfig() {
  const runtimeConfig = getRuntimeConfig()

  return {
    apiUrl: runtimeConfig.NEXT_PUBLIC_DFNS_API_URL,
    orgId: runtimeConfig.NEXT_PUBLIC_DFNS_ORG_ID,
    relyingPartyId: runtimeConfig.NEXT_PUBLIC_DFNS_RP_ID
  }
}

function assertDfnsConfig() {
  const config = getDfnsConfig()
  const requiredConfig = {
    apiUrl: config.apiUrl,
    relyingPartyId: config.relyingPartyId
  }
  const missing = Object.entries(requiredConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length) {
    throw new Error(`Missing Dfns configuration: ${missing.join(', ')}`)
  }

  return config as Required<ReturnType<typeof getDfnsConfig>>
}

function resolveDfnsOrgId(organizationId?: string, fallbackOrgId?: string) {
  if (organizationId?.trim()) return organizationId.trim()
  if (fallbackOrgId?.trim()) return fallbackOrgId.trim()

  throw new Error(
    'Missing Dfns organization id. Add orgId to the OIDC session claims, or set NEXT_PUBLIC_DFNS_ORG_ID as fallback.'
  )
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
    throw new UserRejectedRequestError(
      new Error('Dfns registration cancelled.')
    )
  }

  return promptedUsername.trim()
}

function promptForRegistrationCode() {
  const registrationCode = window.prompt('Dfns registration code')
  if (!registrationCode?.trim()) {
    throw new UserRejectedRequestError(
      new Error('Dfns registration cancelled.')
    )
  }

  return registrationCode.trim()
}

function isEvmDfnsWallet(
  wallet: Awaited<
    ReturnType<DfnsApiClient['wallets']['listWallets']>
  >['items'][number]
) {
  return (
    wallet.status === 'Active' &&
    wallet.signingKey.scheme === 'ECDSA' &&
    wallet.signingKey.curve === 'secp256k1' &&
    typeof wallet.address === 'string' &&
    /^0x[0-9a-fA-F]{40}$/.test(wallet.address)
  )
}

async function resolveDfnsWalletId(dfnsClient: DfnsApiClient) {
  let paginationToken: string | undefined

  do {
    const wallets = await dfnsClient.wallets.listWallets({
      query: { limit: 100, paginationToken }
    })
    const wallet = wallets.items.find(isEvmDfnsWallet)

    if (wallet) return wallet.id

    paginationToken = wallets.nextPageToken
  } while (paginationToken)

  throw new Error('No active EVM Dfns wallet is available for this user.')
}

function getDfnsSelectableChains(fallbackChains: readonly Chain[]): Chain[] {
  const rpcMap = getNodeUriMap()
  const configuredChainIds = Object.keys(rpcMap)
    .map(Number)
    .filter((chainId) => Number.isFinite(chainId))

  const configuredChains = getSupportedChains(configuredChainIds)
  return configuredChains.length > 0 ? configuredChains : [...fallbackChains]
}

function promptForChain(chains: readonly Chain[]): Chain {
  if (chains.length === 0) {
    throw new Error('No Dfns networks are configured.')
  }

  if (chains.length === 1) return chains[0]

  const options = chains
    .map(
      (chain, index) =>
        `${index + 1}. ${chain.name || `Chain ${chain.id}`} (${chain.id})`
    )
    .join('\n')
  const selectedOption = window.prompt(`Select Dfns network:\n${options}`, '1')

  if (!selectedOption) {
    throw new UserRejectedRequestError(
      new Error('Dfns network selection cancelled.')
    )
  }

  const selectedIndex = Number(selectedOption.trim()) - 1
  const selectedChain = chains[selectedIndex]
  if (!selectedChain) {
    throw new Error('Invalid Dfns network selection.')
  }

  return selectedChain
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

function isRegistrationRequiredError(error: unknown): boolean {
  if (!(error instanceof DfnsError)) return false

  const message = error.message.toLowerCase()
  return (
    error.httpStatus === 401 ||
    error.httpStatus === 404 ||
    message.includes('not found') ||
    message.includes('not registered') ||
    message.includes('registration')
  )
}

async function getDfnsSsoToken() {
  const response = await fetch('/api/dfns/get-token', {
    credentials: 'same-origin'
  })
  const data = (await response.json().catch(() => ({}))) as {
    token?: string
    error?: string
  }

  if (!response.ok) {
    throw new Error(data.error || 'Dfns SSO login is required.')
  }

  if (!data.token) {
    throw new Error('Dfns SSO token was not returned.')
  }

  return data.token
}

async function registerDfnsUser({
  authenticator,
  orgId,
  username
}: {
  authenticator: DfnsAuthenticator
  orgId: string
  username: string
}) {
  await authenticator.register({
    orgId,
    username,
    registrationCode: promptForRegistrationCode()
  })
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
    async connect<withCapabilities extends boolean = false>(
      parameters?: DfnsConnectParameters<withCapabilities>
    ): Promise<DfnsConnectReturn<withCapabilities>> {
      const selectableChains = getDfnsSelectableChains(config.chains)
      let activeChain = parameters?.chainId
        ? selectableChains.find((item) => item.id === parameters.chainId)
        : undefined

      if (!activeChain) {
        activeChain = promptForChain(selectableChains)
      }

      const dfnsConfig = assertDfnsConfig()
      const orgId = resolveDfnsOrgId(
        parameters?.organizationId,
        dfnsConfig.orgId
      )
      let registeredUsername: string | undefined
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

      const token = await getDfnsSsoToken()
      const dfnsClient = new DfnsApiClient({
        baseUrl: dfnsConfig.apiUrl,
        authToken: token,
        signer
      })
      let walletId: string
      try {
        walletId = await resolveDfnsWalletId(dfnsClient)
      } catch (error) {
        if (!isRegistrationRequiredError(error)) throw error

        const username = promptForUsername(parameters?.username)
        await registerDfnsUser({
          authenticator,
          orgId,
          username
        })
        registeredUsername = username
        walletId = await resolveDfnsWalletId(dfnsClient)
      }
      const dfnsWallet = await DfnsWallet.init({
        walletId,
        dfnsClient
      })
      const dfnsAccount = toAccount(dfnsWallet)
      let walletClient = createWalletClient({
        account: dfnsAccount,
        chain: activeChain,
        transport: http(activeChain.rpcUrls.default.http[0])
      })

      account = getAddress(dfnsWallet.address)
      chainId = activeChain.id
      connected = true
      setActiveDfnsEoaSigner(
        new DfnsEoaSigner({
          address: account,
          chain: activeChain,
          dfnsWallet,
          provider: new JsonRpcProvider(activeChain.rpcUrls.default.http[0], {
            chainId: activeChain.id,
            name: activeChain.name
          }),
          walletClient
        })
      )
      if (registeredUsername && typeof window !== 'undefined') {
        window.localStorage.setItem('dfns_username', registeredUsername)
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
            const nextChain = selectableChains.find(
              (item) => item.id === fromHex(nextChainId, 'number')
            )
            if (!nextChain) throw new Error('Unsupported chain')
            activeChain = nextChain
            chainId = nextChain.id
            walletClient = createWalletClient({
              account: dfnsAccount,
              chain: activeChain,
              transport: http(activeChain.rpcUrls.default.http[0])
            })
            setActiveDfnsEoaSigner(
              new DfnsEoaSigner({
                address: account!,
                chain: activeChain,
                dfnsWallet,
                provider: new JsonRpcProvider(
                  activeChain.rpcUrls.default.http[0],
                  {
                    chainId: activeChain.id,
                    name: activeChain.name
                  }
                ),
                walletClient
              })
            )
            config.emitter.emit('change', { chainId })
            return null
          }

          return rpcRequest(activeChain, method, params)
        },
        on() {},
        removeListener() {}
      }

      config.emitter.emit('connect', { accounts: [account], chainId })

      return {
        accounts: (parameters?.withCapabilities
          ? [{ address: account, capabilities: {} }]
          : [
              account
            ]) as unknown as DfnsConnectReturn<withCapabilities>['accounts'],
        chainId
      }
    },
    async disconnect() {
      connected = false
      account = undefined
      chainId = undefined
      provider = undefined
      setActiveDfnsEoaSigner(undefined)
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
      setActiveDfnsEoaSigner(undefined)
      config.emitter.emit('disconnect')
    }
  }))
}
