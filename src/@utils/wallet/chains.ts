import { Chain } from 'wagmi/chains'
import * as wagmiChains from 'wagmi/chains'
import { getNodeUriMap } from '../runtimeConfig'
import { LoggerInstance } from '@oceanprotocol/lib'

// Custom OP Sepolia chain
const opSepolia: Chain = {
  id: 11155420,
  name: 'OP Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.dev.pontus-x.eu'] },
    public: { http: ['https://rpc.dev.pontus-x.eu'] }
  },
  blockExplorers: {
    default: {
      name: 'PontusX Explorer',
      url: 'https://explorer.pontus-x.eu/devnet/pontusx'
    }
  },
  testnet: true
}

// Custom Ethereum Hoodi testnet
const ethereumHoodi: Chain = {
  id: 560048,
  name: 'Ethereum Hoodi',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.hoodi.ethpandaops.io'] },
    public: { http: ['https://rpc.hoodi.ethpandaops.io'] }
  },
  blockExplorers: {
    default: {
      name: 'Hoodi Explorer',
      url: 'https://hoodi.etherscan.io'
    }
  },
  testnet: true
}

// Custom chains with intentionally configured, approved RPC URLs.
const customChains: Chain[] = [opSepolia, ethereumHoodi]
const customChainIds = new Set(customChains.map((chain) => chain.id))

function isChain(value: unknown): value is Chain {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'number'
  )
}

/**
 * Returns wagmi-compatible chains filtered by allowed chain IDs.
 *
 * GDPR enforcement: viem built-in chains (e.g. mainnet, optimism) ship
 * with public RPC URLs we do not control. They are only included when a
 * custom RPC is provided via NEXT_PUBLIC_NODE_URI_MAP. Custom chains
 * defined above are treated as approved and always pass through.
 */
export const getSupportedChains = (chainIdsSupported: number[]): Chain[] => {
  // Convert wagmiChains module to array of Chain objects, excluding any
  // that share an ID with a custom chain so the custom definition (with
  // its approved RPC) is used instead of the wagmi-bundled public RPC.
  const wagmiChainValues: unknown[] = Object.values(wagmiChains)
  const baseChains = wagmiChainValues.filter(
    (chain): chain is Chain => isChain(chain) && !customChainIds.has(chain.id)
  )

  const allChains: Chain[] = [...baseChains, ...customChains]

  const rpcMap = getNodeUriMap()

  const allowedChains = allChains.filter((chain) => {
    if (!chainIdsSupported.includes(chain.id)) return false
    if (customChainIds.has(chain.id)) return true
    if (rpcMap[chain.id.toString()]) return true

    LoggerInstance.warn(
      `[chains] Chain ${chain.name} (${chain.id}) excluded: ` +
        `no RPC configured via NEXT_PUBLIC_NODE_URI_MAP`
    )
    return false
  })

  // Apply env RPC overrides to chains that have one configured.
  const mappedChains: Chain[] = allowedChains.map((chain) => {
    const mappedRpc = rpcMap[chain.id.toString()]
    if (!mappedRpc) return chain
    return {
      ...chain,
      rpcUrls: {
        public: { http: [mappedRpc] },
        default: { http: [mappedRpc] }
      }
    }
  })

  return mappedChains
}

/**
 * Maps DFNS BlockchainNetwork enum strings to wagmi chain IDs. DFNS uses
 * named network identifiers (e.g. "EthereumSepolia") in its wallet records;
 * this table is the single source of truth for translating them to numeric
 * chainIds the rest of the codebase uses.
 *
 * Source: https://docs.dfns.co/d/api-docs/wallets/list-wallets
 */
const DFNS_NETWORK_TO_CHAIN_ID: Record<string, number> = {
  Ethereum: 1,
  EthereumSepolia: 11155111,
  EthereumHolesky: 17000,
  EthereumHoodi: 560048,
  Polygon: 137,
  PolygonAmoy: 80002,
  Optimism: 10,
  OptimismSepolia: 11155420,
  Arbitrum: 42161,
  ArbitrumSepolia: 421614,
  Base: 8453,
  BaseSepolia: 84532,
  Bsc: 56,
  BscTestnet: 97,
  Avalanche: 43114,
  AvalancheFuji: 43113
}

export function dfnsNetworkToChainId(network: string): number | undefined {
  return DFNS_NETWORK_TO_CHAIN_ID[network]
}
