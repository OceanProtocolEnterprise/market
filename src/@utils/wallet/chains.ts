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

// Chain IDs of custom chains defined in this file whose hardcoded
// RPC URLs are considered intentionally configured and GDPR-approved.
const customChainIds = new Set([opSepolia.id, ethereumHoodi.id])

/**
 * Returns wagmi-compatible chains filtered by allowed chain IDs.
 *
 * GDPR enforcement: viem built-in chains (e.g. mainnet, optimism) ship
 * with public RPC URLs we do not control. They are only included when a
 * custom RPC is provided via NEXT_PUBLIC_NODE_URI_MAP. Custom chains
 * defined above are treated as approved and always pass through.
 */
export const getSupportedChains = (chainIdsSupported: number[]): Chain[] => {
  // Convert wagmiChains module to array of Chain objects
  const baseChains: Chain[] = Object.values(wagmiChains)

  // Include custom chains
  const allChains = [...baseChains, opSepolia, ethereumHoodi]

  const rpcMap = getNodeUriMap()

  // Only keep chains that have an approved RPC: either a custom chain
  // (hardcoded RPC we control) or a viem built-in with an env override.
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
  const mappedChains = allowedChains.map((chain) => {
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
