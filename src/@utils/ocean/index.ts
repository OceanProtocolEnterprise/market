import {
  ConfigHelper,
  Config,
  getOceanArtifactsAddressesByChainId
} from '@oceanprotocol/lib'
import { getAddress } from 'ethers'

export interface ConfigEnterprise extends Config {
  tokenAddresses: string[]
  escrowAddress?: string
}

/**
  This function takes a Config object as an input and returns a new sanitized Config object
  The new Config object has the same properties as the input object, but with some values replaced by environment variables if they exist
  Also adds missing contract addresses deployed when running barge locally
  @param {Config} config - The input Config object
  @returns {Config} A new Config object
*/
export function sanitizeDevelopmentConfig(config: Config): Config {
  return {
    nodeUri: config.nodeUri,
    oceanNodeUri: process.env.NEXT_PUBLIC_PROVIDER_URL || config.oceanNodeUri,
    fixedRateExchangeAddress:
      process.env.NEXT_PUBLIC_FIXED_RATE_EXCHANGE_ADDRESS,
    dispenserAddress: process.env.NEXT_PUBLIC_DISPENSER_ADDRESS,
    oceanTokenAddress: config.oceanTokenAddress,
    nftFactoryAddress: process.env.NEXT_PUBLIC_NFT_FACTORY_ADDRESS,
    routerFactoryAddress: process.env.NEXT_PUBLIC_ROUTER_FACTORY_ADDRESS,
    accessListFactory:
      config.accessListFactory ||
      process.env.NEXT_PUBLIC_ACCESS_LIST_FACTORY_ADDRESS
  } as Config
}

/**
 * Helper to validate and checksum a list of addresses.
 * Removes invalid addresses and logs a warning.
 */
function validateAndChecksumAddresses(addresses: string[]): string[] {
  return addresses.reduce((acc: string[], address) => {
    try {
      // ethers.utils.getAddress (v5) or ethers.getAddress (v6) throws if invalid
      // and returns the checksummed address if valid.
      const checksummed = getAddress(address) // ethers v6

      acc.push(checksummed)
    } catch (e) {
      console.warn(
        `[Config] Invalid address found in env: ${address}, skipping.`
      )
    }
    return acc
  }, [])
}

export function getOceanConfig(network: string | number): ConfigEnterprise {
  // Load the RPC map from .env
  const rpcMap: Record<string, string> = process.env.NEXT_PUBLIC_NODE_URI_MAP
    ? JSON.parse(process.env.NEXT_PUBLIC_NODE_URI_MAP)
    : {}

  const erc20Map: Record<string, string[]> = process.env
    .NEXT_PUBLIC_ALLOWED_ERC20_ADDRESSES
    ? JSON.parse(process.env.NEXT_PUBLIC_ALLOWED_ERC20_ADDRESSES)
    : {}

  if (!network) {
    console.warn('[getOceanConfig] No network provided yet.')
    return {} as ConfigEnterprise
  }

  let config = new ConfigHelper().getConfig(
    network,
    network === 'polygon' ||
      network === 'moonbeamalpha' ||
      network === 1287 ||
      network === 'bsc' ||
      network === 56 ||
      network === 8996
      ? undefined
      : process.env.NEXT_PUBLIC_INFURA_PROJECT_ID
  ) as any
  if (network === 8996) {
    config = { ...config, ...sanitizeDevelopmentConfig(config) }
  }
  // Override nodeUri with value from RPC map if it exists
  const networkKey = network.toString()
  if (rpcMap[networkKey]) config.nodeUri = rpcMap[networkKey]
  if (erc20Map[networkKey]) {
    const validAddresses = validateAndChecksumAddresses(erc20Map[networkKey])

    config.tokenAddresses = validAddresses
  } else {
    // Fallback if no map entry exists: use the default config ocean token as a single-item array
    config.tokenAddresses = [config.oceanTokenAddress]
  } // Get contracts for current network
  const enterpriseContracts = getOceanArtifactsAddressesByChainId(
    Number(network)
  )
  // Override config with enterprise contracts if present
  if (enterpriseContracts) {
    config.escrowAddress =
      enterpriseContracts.EnterpriseEscrow || config.escrowAddress
    config.fixedRateExchangeAddress =
      enterpriseContracts.FixedPriceEnterprise ||
      enterpriseContracts.FixedPrice ||
      config.fixedRateExchangeAddress
    config.routerFactoryAddress =
      enterpriseContracts.Router || config.routerFactoryAddress
    config.nftFactoryAddress =
      enterpriseContracts.ERC721Factory || config.nftFactoryAddress
    config.dispenserAddress =
      enterpriseContracts.Dispenser || config.dispenserAddress
    config.accessListFactory =
      enterpriseContracts.AccessListFactory || config.accessListFactory
    config.opfCommunityFeeCollector =
      enterpriseContracts.OPFCommunityFeeCollector ||
      config.opfCommunityFeeCollector
    config.EnterpriseFeeCollector =
      enterpriseContracts.EnterpriseFeeCollector ||
      config.EnterpriseFeeCollector
    config.startBlock = enterpriseContracts.startBlock || config.startBlock
    config.ERC20Template = enterpriseContracts.ERC20Template
    config.ERC721Template = enterpriseContracts.ERC721Template
    config.OPFCommunityFeeCollectorCompute =
      enterpriseContracts.OPFCommunityFeeCollectorCompute
  }
  return config as ConfigEnterprise
}

export function getDevelopmentConfig(): Config {
  return {
    // factoryAddress: contractAddresses.development?.DTFactory,
    // poolFactoryAddress: contractAddresses.development?.BFactory,
    // fixedRateExchangeAddress: contractAddresses.development?.FixedRateExchange,
    // metadataContractAddress: contractAddresses.development?.Metadata,
    // oceanTokenAddress: contractAddresses.development?.Ocean,
    // There is no subgraph in barge so we hardcode the Sepolia one for now
    nodeUri: 'https://v4.subgraph.sepolia.oceanprotocol.com'
  } as Config
}
