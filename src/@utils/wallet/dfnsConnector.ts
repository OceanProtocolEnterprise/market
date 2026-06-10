import { DfnsApiClient, DfnsAuthenticator, DfnsError } from '@dfns/sdk'
import { WebAuthnSigner } from '@dfns/sdk-browser'
import {
  type Address,
  type Chain,
  type Hex,
  fromHex,
  getAddress,
  numberToHex
} from 'viem'
import { createConnector } from 'wagmi'
import { UserRejectedRequestError } from 'viem'
import { getNodeUriMap, getRuntimeConfig } from '../runtimeConfig'
import {
  dfnsNetworkToChainId,
  getSupportedChains,
  pickPreferredChainId
} from './chains'
import {
  DfnsEoaSigner,
  getActiveDfnsEoaSigner,
  setActiveDfnsEoaSigner
} from './dfnsEoaSigner'

type DfnsProvider = {
  request(args: { method: string; params?: unknown }): Promise<unknown>
  on(event: string, listener: (...args: unknown[]) => void): void
  removeListener(event: string, listener: (...args: unknown[]) => void): void
}

type DfnsConnectParameters<withCapabilities extends boolean = false> = {
  allowRegistrationCodePrompt?: boolean
  chainId?: number
  isReconnecting?: boolean
  organizationId?: string
  registrationCode?: string
  withCapabilities?: withCapabilities | boolean
  username?: string
}

type DfnsConnectReturn<withCapabilities extends boolean = false> = {
  accounts: withCapabilities extends true
    ? readonly { address: Address; capabilities: Record<string, unknown> }[]
    : readonly Address[]
  chainId: number
}

export const DFNS_CONNECTOR_ID = 'dfns'
const DFNS_SELECTED_CHAIN_ID_KEY = 'dfns_selected_chain_id'
const DFNS_REQUIRED_TRANSACTION_PERMISSION = 'Wallets:Transactions:Create'
export const DFNS_REGISTRATION_CODE_REQUIRED_MESSAGE =
  'Dfns registration code is required.'
export const DFNS_INSUFFICIENT_PERMISSIONS_MESSAGE =
  'User does not have enough permissions from DFNS'

function getDfnsConfig() {
  const runtimeConfig = getRuntimeConfig()

  return {
    apiUrl: runtimeConfig.NEXT_PUBLIC_DFNS_API_URL,
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

  return config as ReturnType<typeof getDfnsConfig> & {
    apiUrl: string
    relyingPartyId: string
  }
}

function resolveDfnsOrgId(organizationId?: string) {
  if (organizationId?.trim()) return organizationId.trim()

  throw new Error(
    'Missing Dfns organization id. Add orgId to the OIDC session claims.'
  )
}

async function assertDfnsTransactionCreatePermission(
  dfnsClient: DfnsApiClient
) {
  let paginationToken: string | undefined

  do {
    const page = await dfnsClient.permissions.listPermissions({
      query: { limit: 100, paginationToken }
    })

    const hasPermission = page.items.some(
      (permission) =>
        permission.status === 'Active' &&
        !permission.isArchived &&
        permission.operations.includes(DFNS_REQUIRED_TRANSACTION_PERMISSION)
    )
    if (hasPermission) return

    paginationToken = page.nextPageToken
  } while (paginationToken)

  throw new Error(DFNS_INSUFFICIENT_PERMISSIONS_MESSAGE)
}

function assertRequestedAccount(
  requestedAddress: string | undefined,
  signerAddress: Address,
  method: string
) {
  if (!requestedAddress) {
    throw new Error(`${method} requires an account address.`)
  }

  if (getAddress(requestedAddress) !== getAddress(signerAddress)) {
    throw new Error(`${method} requested a different account.`)
  }
}

function getDefaultUsername(username?: string) {
  if (username) return username
  if (typeof window === 'undefined') return ''

  try {
    return window.localStorage.getItem('dfns_username') || ''
  } catch {
    return ''
  }
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

/**
 * Build the chainId -> DFNS walletId map for the authenticated user.
 *
 * DFNS provisions one wallet per network (each with its own walletId) that
 * share the same secp256k1 signing key, so the EVM address is identical
 * across all returned wallets. The map is filtered to `allowedChainIds`
 * (env-allowed chains in the wagmi config) so callers never see chains the
 * marketplace can't actually use.
 *
 * On-chain Ocean validation (`validatedSupportedChains`) is applied further
 * downstream by the UI layer; the connector cannot reach React context.
 */
async function listDfnsWalletsByChain(
  dfnsClient: DfnsApiClient,
  allowedChainIds: ReadonlySet<number>
): Promise<Map<number, string>> {
  const result = new Map<number, string>()
  let paginationToken: string | undefined

  do {
    const page = await dfnsClient.wallets.listWallets({
      query: { limit: 100, paginationToken }
    })

    for (const wallet of page.items) {
      if (!isEvmDfnsWallet(wallet)) continue
      const chainId = dfnsNetworkToChainId(wallet.network)
      if (!chainId) continue
      if (!allowedChainIds.has(chainId)) continue
      if (result.has(chainId)) continue
      result.set(chainId, wallet.id)
    }

    paginationToken = page.nextPageToken
  } while (paginationToken)

  return result
}

export function getDfnsSelectableChains(
  fallbackChains: readonly Chain[]
): Chain[] {
  const rpcMap = getNodeUriMap()
  const configuredChainIds = Object.keys(rpcMap)
    .map(Number)
    .filter((chainId) => Number.isFinite(chainId))

  const configuredChains = getSupportedChains(configuredChainIds)
  return configuredChains.length > 0 ? configuredChains : [...fallbackChains]
}

/**
 * Resolves the default DFNS chain from a list of selectable chains, following
 * the marketplace preference order (Ethereum Sepolia → OP Sepolia → first).
 */
export function getDefaultDfnsChain(
  chains: readonly Chain[]
): Chain | undefined {
  const preferredId = pickPreferredChainId(chains.map((chain) => chain.id))
  return chains.find((chain) => chain.id === preferredId)
}

/**
 * Picks the network a DFNS wallet should default to when the user has not
 * explicitly chosen one, so first-time login never blocks on a prompt.
 */
function pickDefaultDfnsChain(chains: readonly Chain[]): Chain {
  const defaultChain = getDefaultDfnsChain(chains)
  if (!defaultChain) {
    throw new Error('No Dfns networks are configured.')
  }

  return defaultChain
}

/**
 * Resolves the default chain id from the user's provisioned DFNS wallet chains,
 * following the same preference order. Used for post-connect reconciliation.
 */
export function getDefaultDfnsWalletChainId(walletChainIds: Iterable<number>) {
  return pickPreferredChainId(walletChainIds)
}

export function getStoredDfnsSelectedChainId() {
  if (typeof window === 'undefined') return undefined

  let storedValue: string | null
  try {
    storedValue = window.sessionStorage.getItem(DFNS_SELECTED_CHAIN_ID_KEY)
  } catch {
    return undefined
  }

  if (!storedValue) return undefined

  const storedChainId = Number(storedValue)
  if (!Number.isInteger(storedChainId) || storedChainId <= 0) return undefined

  return storedChainId
}

export function storeDfnsSelectedChainId(chainId: number) {
  if (typeof window === 'undefined') return
  if (!Number.isInteger(chainId) || chainId <= 0) return

  try {
    window.sessionStorage.setItem(DFNS_SELECTED_CHAIN_ID_KEY, String(chainId))
  } catch {
    // Continue without persistence when browser storage is unavailable.
  }
}

function getStoredDfnsChain(chains: readonly Chain[]): Chain | undefined {
  const storedChainId = getStoredDfnsSelectedChainId()
  if (!storedChainId) return undefined

  return chains.find((chain) => chain.id === storedChainId)
}

function storeDfnsChain(chain: Chain) {
  storeDfnsSelectedChainId(chain.id)
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

function getRequestedSwitchChainId(params: unknown): number {
  if (!Array.isArray(params)) {
    throw new Error('Missing wallet_switchEthereumChain parameters.')
  }

  const [request] = params as [{ chainId?: unknown }]
  if (!isHex(request?.chainId)) {
    throw new Error('Invalid wallet_switchEthereumChain chain id.')
  }

  return fromHex(request.chainId, 'number')
}

function isRegistrationRequiredError(error: unknown): boolean {
  if (!(error instanceof DfnsError)) return false

  const message = error.message.toLowerCase()
  return (
    error.httpStatus === 404 ||
    message.includes('not found') ||
    message.includes('not registered') ||
    message.includes('registration')
  )
}

function isDfnsAuthTokenError(error: unknown): boolean {
  if (!(error instanceof DfnsError)) return false

  const message = error.message.toLowerCase()
  return (
    error.httpStatus === 401 &&
    (message.includes('token') ||
      message.includes('unauthorized') ||
      message.includes('missing or invalid'))
  )
}

function isMissingCredentialError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()
  return (
    message.includes('does not have a credential') ||
    message.includes('no credential') ||
    (message.includes('credential') && message.includes('application'))
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
  registrationCode,
  username
}: {
  authenticator: DfnsAuthenticator
  orgId: string
  registrationCode?: string
  username: string
}) {
  await authenticator.register({
    orgId,
    username,
    registrationCode: registrationCode?.trim() || promptForRegistrationCode()
  })
}

async function hasUsableDfnsPasskey({
  dfnsClient,
  relyingPartyId
}: {
  dfnsClient: DfnsApiClient
  relyingPartyId: string
}) {
  const credentials = await dfnsClient.auth.listCredentials()
  const hasPasskey = credentials.items.some(
    (credential) =>
      credential.isActive &&
      credential.kind === 'Fido2' &&
      credential.relyingPartyId === relyingPartyId
  )

  return hasPasskey
}

async function createDfnsPasskeyWithCode({
  authenticator,
  registrationCode,
  username,
  orgId
}: {
  authenticator: DfnsAuthenticator
  registrationCode: string
  username: string
  orgId: string
}) {
  await authenticator.register({
    orgId,
    username,
    registrationCode
  })
}

/**
 * Module-level cache of the active DFNS wallets-by-chain map. Mirrors the
 * pattern used for the active signer so hooks (useDfnsWalletsByChain) can
 * subscribe via useSyncExternalStore.
 */
let activeWalletsByChain: ReadonlyMap<number, string> | undefined
const walletsByChainListeners = new Set<() => void>()

function setActiveDfnsWalletsByChain(
  map: ReadonlyMap<number, string> | undefined
) {
  activeWalletsByChain = map
  walletsByChainListeners.forEach((listener) => listener())
}

export function getActiveDfnsWalletsByChain() {
  return activeWalletsByChain
}

export function subscribeToActiveDfnsWalletsByChain(listener: () => void) {
  walletsByChainListeners.add(listener)
  return () => {
    walletsByChainListeners.delete(listener)
  }
}

export function dfnsConnector() {
  let connected = false
  let account: Address | undefined
  let chainId: number | undefined
  let provider: DfnsProvider | undefined
  let chainsById: ReadonlyMap<number, Chain> | undefined
  let connectionEpoch = 0

  let switchQueue: Promise<unknown> = Promise.resolve()
  let latestRequestedChainId: number | undefined

  return createConnector<DfnsProvider>((config) => {
    const switchToChain = async (nextChainId: number): Promise<void> => {
      latestRequestedChainId = nextChainId
      const switchEpoch = connectionEpoch
      switchQueue = switchQueue
        .catch(() => undefined)
        .then(async () => {
          if (latestRequestedChainId !== nextChainId) return

          const signer = getActiveDfnsEoaSigner()
          if (!connected || !signer || switchEpoch !== connectionEpoch) {
            throw new Error('Dfns wallet is not connected.')
          }
          if (signer.getChainId() === nextChainId) return

          const nextSigner = await signer.createSignerForChain(nextChainId)
          if (
            !connected ||
            switchEpoch !== connectionEpoch ||
            latestRequestedChainId !== nextChainId
          ) {
            return
          }

          setActiveDfnsEoaSigner(nextSigner)
          account = nextSigner.address
          chainId = nextSigner.getChainId()
          storeDfnsSelectedChainId(nextChainId)
          config.emitter.emit('change', {
            accounts: account ? [account] : undefined,
            chainId
          })
        })
      await switchQueue
    }

    const createProvider = (): DfnsProvider => ({
      async request({ method, params }) {
        const currentSigner = getActiveDfnsEoaSigner()
        if (!currentSigner) {
          throw new Error('Dfns wallet is not connected.')
        }

        if (method === 'eth_chainId') {
          return numberToHex(currentSigner.getChainId())
        }
        if (method === 'eth_accounts' || method === 'eth_requestAccounts') {
          return [currentSigner.address]
        }
        if (method === 'personal_sign' || method === 'eth_sign') {
          const [first, second] = (params as [string, string]) || []
          const requestedAddress = method === 'eth_sign' ? first : second
          const message = method === 'eth_sign' ? second : first
          assertRequestedAccount(
            requestedAddress,
            currentSigner.address,
            method
          )
          if (!message) throw new Error(`${method} requires a message.`)

          const walletClient = currentSigner.getWalletClient()
          return walletClient.signMessage({
            account: currentSigner.address,
            message: isHex(message) ? { raw: message } : message
          })
        }
        if (method === 'eth_sendTransaction') {
          const [tx] = (params as [Record<string, Hex>]) || []
          if (!tx) {
            throw new Error('eth_sendTransaction requires a transaction.')
          }
          assertRequestedAccount(tx.from, currentSigner.address, method)

          const walletClient = currentSigner.getWalletClient()
          const transaction = {
            account: currentSigner.address,
            to: tx.to,
            value: tx.value ? BigInt(tx.value) : undefined,
            data: tx.data || '0x',
            gas: tx.gas ? BigInt(tx.gas) : undefined,
            gasPrice: tx.gasPrice ? BigInt(tx.gasPrice) : undefined,
            maxFeePerGas: tx.maxFeePerGas ? BigInt(tx.maxFeePerGas) : undefined,
            maxPriorityFeePerGas: tx.maxPriorityFeePerGas
              ? BigInt(tx.maxPriorityFeePerGas)
              : undefined,
            nonce: tx.nonce ? fromHex(tx.nonce, 'number') : undefined
          } as unknown as Parameters<typeof walletClient.sendTransaction>[0]

          return walletClient.sendTransaction(transaction)
        }
        if (method === 'wallet_switchEthereumChain') {
          const nextChainId = getRequestedSwitchChainId(params)
          if (!currentSigner.hasWalletForChain(nextChainId)) {
            throw new Error(
              `No DFNS wallet provisioned for chain ${nextChainId}.`
            )
          }
          await switchToChain(nextChainId)
          return null
        }

        const chainForRead =
          chainsById?.get(currentSigner.getChainId()) ??
          currentSigner.getChain()
        return rpcRequest(chainForRead, method, params)
      },
      on() {},
      removeListener() {}
    })
    const reconnectProvider = createProvider()

    return {
      id: DFNS_CONNECTOR_ID,
      name: 'Dfns Account',
      type: DFNS_CONNECTOR_ID,
      async connect<withCapabilities extends boolean = false>(
        parameters?: DfnsConnectParameters<withCapabilities>
      ): Promise<DfnsConnectReturn<withCapabilities>> {
        const selectableChains = getDfnsSelectableChains(config.chains)
        const token = await getDfnsSsoToken()
        let activeChain = parameters?.chainId
          ? selectableChains.find((item) => item.id === parameters.chainId)
          : getStoredDfnsChain(selectableChains)

        if (!activeChain) {
          activeChain = pickDefaultDfnsChain(selectableChains)
        }
        storeDfnsChain(activeChain)

        const dfnsConfig = assertDfnsConfig()
        let registeredUsername: string | undefined
        const webAuthnSigner = new WebAuthnSigner({
          relyingParty: {
            id: dfnsConfig.relyingPartyId,
            name: 'Ocean Enterprise Marketplace'
          }
        })
        const authenticator = new DfnsAuthenticator({
          baseUrl: dfnsConfig.apiUrl,
          signer: webAuthnSigner
        })

        const dfnsClient = new DfnsApiClient({
          baseUrl: dfnsConfig.apiUrl,
          authToken: token,
          signer: webAuthnSigner
        })
        await assertDfnsTransactionCreatePermission(dfnsClient)

        const registrationCode = parameters?.registrationCode?.trim()

        try {
          const hasPasskey = await hasUsableDfnsPasskey({
            dfnsClient,
            relyingPartyId: dfnsConfig.relyingPartyId
          })

          if (!hasPasskey) {
            if (
              !registrationCode &&
              parameters?.allowRegistrationCodePrompt === false
            ) {
              throw new Error(DFNS_REGISTRATION_CODE_REQUIRED_MESSAGE)
            }

            const username = promptForUsername(parameters?.username)
            await createDfnsPasskeyWithCode({
              authenticator,
              registrationCode: registrationCode || promptForRegistrationCode(),
              username,
              orgId: resolveDfnsOrgId(parameters?.organizationId)
            })
            registeredUsername = username
          }
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === DFNS_REGISTRATION_CODE_REQUIRED_MESSAGE
          ) {
            throw error
          }

          if (isDfnsAuthTokenError(error)) {
            throw new Error('Dfns SSO login is required.')
          }

          if (
            !isRegistrationRequiredError(error) &&
            !isMissingCredentialError(error)
          ) {
            throw error
          }

          if (
            !registrationCode &&
            parameters?.allowRegistrationCodePrompt === false
          ) {
            throw new Error(DFNS_REGISTRATION_CODE_REQUIRED_MESSAGE)
          }

          const username = promptForUsername(parameters?.username)
          await registerDfnsUser({
            authenticator,
            orgId: resolveDfnsOrgId(parameters?.organizationId),
            registrationCode,
            username
          })
          registeredUsername = username
        }

        const allowedChainIds = new Set(selectableChains.map((c) => c.id))
        let walletsByChain: Map<number, string>
        try {
          walletsByChain = await listDfnsWalletsByChain(
            dfnsClient,
            allowedChainIds
          )
        } catch (error) {
          if (isDfnsAuthTokenError(error)) {
            throw new Error('Dfns SSO login is required.')
          }

          if (!isRegistrationRequiredError(error)) throw error

          if (
            !registrationCode &&
            parameters?.allowRegistrationCodePrompt === false
          ) {
            throw new Error(DFNS_REGISTRATION_CODE_REQUIRED_MESSAGE)
          }

          const username = promptForUsername(parameters?.username)
          await registerDfnsUser({
            authenticator,
            orgId: resolveDfnsOrgId(parameters?.organizationId),
            registrationCode,
            username
          })
          registeredUsername = username
          walletsByChain = await listDfnsWalletsByChain(
            dfnsClient,
            allowedChainIds
          )
        }

        if (walletsByChain.size === 0) {
          throw new Error(
            'No DFNS wallets are provisioned on any marketplace-supported network.'
          )
        }

        // Fall back if the user selected a chain we have no wallet on. The
        // chain picker is best-effort pre-connect; this is the post-connect
        // reconciliation. Prefer Ethereum Sepolia (marketplace default) when a
        // wallet exists there, otherwise the first available wallet chain.
        if (!walletsByChain.has(activeChain.id)) {
          const fallbackChainId = getDefaultDfnsWalletChainId(
            walletsByChain.keys()
          )
          if (!fallbackChainId) {
            throw new Error(
              'No DFNS wallets are provisioned on any marketplace-supported network.'
            )
          }
          const fallbackChain = selectableChains.find(
            (item) => item.id === fallbackChainId
          )
          if (!fallbackChain) {
            throw new Error(
              `DFNS wallet exists for chain ${fallbackChainId} but it is not in the wagmi chain config.`
            )
          }
          activeChain = fallbackChain
          storeDfnsChain(activeChain)
        }

        chainsById = new Map(selectableChains.map((chain) => [chain.id, chain]))

        const signer = await DfnsEoaSigner.createForChain({
          chainId: activeChain.id,
          dfnsClient,
          chainsById,
          walletsByChain
        })
        setActiveDfnsEoaSigner(signer)
        setActiveDfnsWalletsByChain(walletsByChain)

        account = signer.address
        chainId = activeChain.id
        connected = true
        connectionEpoch += 1

        if (registeredUsername && typeof window !== 'undefined') {
          try {
            window.localStorage.setItem('dfns_username', registeredUsername)
          } catch {
            // Continue without caching the username when storage is unavailable.
          }
        }

        provider = createProvider()

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
        chainsById = undefined
        latestRequestedChainId = undefined
        connectionEpoch += 1
        setActiveDfnsEoaSigner(undefined)
        setActiveDfnsWalletsByChain(undefined)
        config.emitter.emit('disconnect')
      },
      async getAccounts() {
        return account ? [account] : []
      },
      async getChainId() {
        return chainId ?? config.chains[0].id
      },
      async getProvider() {
        return provider ?? reconnectProvider
      },
      async isAuthorized() {
        if (connected && account) return true

        try {
          await getDfnsSsoToken()
          return true
        } catch {
          return false
        }
      },
      async switchChain({ chainId: nextChainId }) {
        const signer = getActiveDfnsEoaSigner()
        if (!signer) {
          throw new Error('Dfns wallet is not connected.')
        }
        const chain = config.chains.find((item) => item.id === nextChainId)
        if (!chain) throw new Error('Unsupported chain')
        if (!signer.hasWalletForChain(nextChainId)) {
          throw new Error(
            `No DFNS wallet provisioned for chain ${nextChainId}.`
          )
        }
        await switchToChain(nextChainId)
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
        chainId = undefined
        provider = undefined
        chainsById = undefined
        latestRequestedChainId = undefined
        connectionEpoch += 1
        setActiveDfnsEoaSigner(undefined)
        setActiveDfnsWalletsByChain(undefined)
        config.emitter.emit('disconnect')
      }
    }
  })
}
