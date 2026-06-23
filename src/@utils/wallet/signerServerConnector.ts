import {
  type Address,
  type Chain,
  type Hex,
  fromHex,
  getAddress,
  numberToHex
} from 'viem'
import { createConnector } from 'wagmi'
import { getRuntimeConfig } from '../runtimeConfig'
import { pickPreferredChainId } from './chains'
import {
  getSignerServerAddress,
  getSignerServerNetworks,
  sendSignerServerTransaction
} from './signerServerApi'
import {
  SignerServerEoaSigner,
  getActiveSignerServerEoaSigner,
  setActiveSignerServerEoaSigner
} from './signerServerEoaSigner'

type SignerServerProvider = {
  request(args: { method: string; params?: unknown }): Promise<unknown>
  on(event: string, listener: (...args: unknown[]) => void): void
  removeListener(event: string, listener: (...args: unknown[]) => void): void
}

type SignerServerConnectParameters<withCapabilities extends boolean = false> = {
  chainId?: number
  withCapabilities?: withCapabilities | boolean
}

type SignerServerConnectReturn<withCapabilities extends boolean = false> = {
  accounts: withCapabilities extends true
    ? readonly { address: Address; capabilities: Record<string, unknown> }[]
    : readonly Address[]
  chainId: number
}

export const SIGNER_SERVER_CONNECTOR_ID = 'signerServer'
export const NO_SIGNER_SERVER_NETWORKS_MESSAGE =
  'No supported networks by Signer Server'
const SIGNER_SERVER_SELECTED_CHAIN_ID_KEY = 'signer_server_selected_chain_id'

function getSignerServerUrl() {
  return getRuntimeConfig().NEXT_PUBLIC_SIGNER_SERVER_URL?.trim()
}

export function isSignerServerConfigured() {
  return Boolean(getSignerServerUrl())
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

async function rpcRequest(
  chain: Chain,
  method: string,
  params: unknown
): Promise<unknown> {
  const response = await fetch(chain.rpcUrls.default.http[0], {
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

function getStoredSignerServerSelectedChainId() {
  if (typeof window === 'undefined') return undefined

  let storedValue: string | null
  try {
    storedValue = window.sessionStorage.getItem(
      SIGNER_SERVER_SELECTED_CHAIN_ID_KEY
    )
  } catch {
    return undefined
  }

  if (!storedValue) return undefined

  const storedChainId = Number(storedValue)
  if (!Number.isInteger(storedChainId) || storedChainId <= 0) return undefined

  return storedChainId
}

function storeSignerServerSelectedChainId(chainId: number) {
  if (typeof window === 'undefined') return
  if (!Number.isInteger(chainId) || chainId <= 0) return

  try {
    window.sessionStorage.setItem(
      SIGNER_SERVER_SELECTED_CHAIN_ID_KEY,
      String(chainId)
    )
  } catch {
    // Continue without persistence when browser storage is unavailable.
  }
}

function isAuthLoginPage() {
  return (
    typeof window !== 'undefined' && window.location.pathname === '/auth/login'
  )
}

function pickSignerServerChain(
  chains: readonly Chain[],
  requestedChainId?: number
) {
  if (requestedChainId) {
    const requestedChain = chains.find((chain) => chain.id === requestedChainId)
    if (requestedChain) return requestedChain
  }

  const storedChainId = getStoredSignerServerSelectedChainId()
  if (storedChainId) {
    const storedChain = chains.find((chain) => chain.id === storedChainId)
    if (storedChain) return storedChain
  }

  const preferredId = pickPreferredChainId(chains.map((chain) => chain.id))
  const preferredChain = chains.find((chain) => chain.id === preferredId)
  if (preferredChain) return preferredChain

  return chains[0]
}

export function signerServerConnector() {
  let connected = false
  let account: Address | undefined
  let chainId: number | undefined
  let provider: SignerServerProvider | undefined
  let chainsById: ReadonlyMap<number, Chain> | undefined
  let connectionEpoch = 0

  let switchQueue: Promise<unknown> = Promise.resolve()
  let latestRequestedChainId: number | undefined

  return createConnector<SignerServerProvider>((config) => {
    const switchToChain = async (nextChainId: number): Promise<void> => {
      latestRequestedChainId = nextChainId
      const switchEpoch = connectionEpoch
      switchQueue = switchQueue
        .catch(() => undefined)
        .then(async () => {
          if (latestRequestedChainId !== nextChainId) return

          const signer = getActiveSignerServerEoaSigner()
          if (!connected || !signer || switchEpoch !== connectionEpoch) {
            throw new Error('Signer server wallet is not connected.')
          }
          if (signer.getChainId() === nextChainId) return

          const nextSigner = signer.createSignerForChain(nextChainId)
          if (
            !connected ||
            switchEpoch !== connectionEpoch ||
            latestRequestedChainId !== nextChainId
          ) {
            return
          }

          setActiveSignerServerEoaSigner(nextSigner)
          account = nextSigner.address
          chainId = nextSigner.getChainId()
          storeSignerServerSelectedChainId(nextChainId)
          config.emitter.emit('change', {
            accounts: account ? [account] : undefined,
            chainId
          })
        })
      await switchQueue
    }

    const createProvider = (): SignerServerProvider => ({
      async request({ method, params }) {
        const currentSigner = getActiveSignerServerEoaSigner()
        if (!currentSigner) {
          throw new Error('Signer server wallet is not connected.')
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
          if (!message || !isHex(message)) {
            throw new Error(`${method} requires a hex message.`)
          }

          return currentSigner.signMessage(fromHex(message, 'bytes'))
        }
        if (method === 'eth_sendTransaction') {
          const [tx] = (params as [Record<string, Hex>]) || []
          if (!tx) {
            throw new Error('eth_sendTransaction requires a transaction.')
          }
          assertRequestedAccount(tx.from, currentSigner.address, method)
          if (!tx.to) {
            throw new Error('eth_sendTransaction requires a recipient.')
          }

          const result = await sendSignerServerTransaction({
            chainId: currentSigner.getChainId(),
            to: getAddress(tx.to),
            value: tx.value ? BigInt(tx.value).toString() : '0',
            data: tx.data || '0x'
          })

          return result.hash
        }
        if (method === 'wallet_switchEthereumChain') {
          const nextChainId = getRequestedSwitchChainId(params)
          if (!currentSigner.hasWalletForChain(nextChainId)) {
            throw new Error(
              `Signer server does not support chain ${nextChainId}.`
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
      id: SIGNER_SERVER_CONNECTOR_ID,
      name: 'Signer Server',
      type: SIGNER_SERVER_CONNECTOR_ID,
      async connect<withCapabilities extends boolean = false>(
        parameters?: SignerServerConnectParameters<withCapabilities>
      ): Promise<SignerServerConnectReturn<withCapabilities>> {
        if (!isSignerServerConfigured()) {
          throw new Error('Signer server URL is not configured.')
        }

        const signerNetworks = await getSignerServerNetworks()
        const signerChainIds = new Set(
          signerNetworks
            .map((network) => network.chainId)
            .filter((id) => Number.isInteger(id) && id > 0)
        )
        const commonChains = config.chains.filter((chain) =>
          signerChainIds.has(chain.id)
        )
        if (commonChains.length === 0) {
          throw new Error(NO_SIGNER_SERVER_NETWORKS_MESSAGE)
        }

        const activeChain = pickSignerServerChain(
          commonChains,
          parameters?.chainId
        )
        storeSignerServerSelectedChainId(activeChain.id)

        const addressResponse = await getSignerServerAddress()
        chainsById = new Map(commonChains.map((chain) => [chain.id, chain]))
        const signer = SignerServerEoaSigner.createForChain({
          address: getAddress(addressResponse.address),
          chainId: activeChain.id,
          chainsById
        })
        setActiveSignerServerEoaSigner(signer)

        account = signer.address
        chainId = activeChain.id
        connected = true
        connectionEpoch += 1
        provider = createProvider()

        config.emitter.emit('connect', { accounts: [account], chainId })

        return {
          accounts: (parameters?.withCapabilities
            ? [{ address: account, capabilities: {} }]
            : [
                account
              ]) as unknown as SignerServerConnectReturn<withCapabilities>['accounts'],
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
        setActiveSignerServerEoaSigner(undefined)
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
        if (isAuthLoginPage()) return false
        if (!isSignerServerConfigured()) return false

        try {
          await getSignerServerAddress()
          return true
        } catch {
          return false
        }
      },
      async switchChain({ chainId: nextChainId }) {
        const signer = getActiveSignerServerEoaSigner()
        if (!signer) {
          throw new Error('Signer server wallet is not connected.')
        }
        const chain = config.chains.find((item) => item.id === nextChainId)
        if (!chain) throw new Error('Unsupported chain')
        if (!signer.hasWalletForChain(nextChainId)) {
          throw new Error(
            `Signer server does not support chain ${nextChainId}.`
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
        setActiveSignerServerEoaSigner(undefined)
        config.emitter.emit('disconnect')
      }
    }
  })
}
