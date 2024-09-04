import { ConfigHelper, Config, Datatoken } from '@oceanprotocol/lib'
import { ethers } from 'ethers'
import abiDatatoken from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20TemplateEnterprise.sol/ERC20TemplateEnterprise.json'
import { getDummySigner } from '@utils/wallet'

/**
  This function takes a Config object as an input and returns a new sanitized Config object
  The new Config object has the same properties as the input object, but with some values replaced by environment variables if they exist
  Also adds missing contract addresses deployed when running barge locally
  @param {Config} config - The input Config object
  @returns {Config} A new Config object
*/
export function sanitizeDevelopmentConfig(config: Config): Config {
  return {
    subgraphUri: process.env.NEXT_PUBLIC_SUBGRAPH_URI || config.subgraphUri,
    metadataCacheUri:
      process.env.NEXT_PUBLIC_METADATACACHE_URI || config.metadataCacheUri,
    providerUri: process.env.NEXT_PUBLIC_PROVIDER_URL || config.providerUri,
    nodeUri: process.env.NEXT_PUBLIC_RPC_URL || config.nodeUri,
    fixedRateExchangeAddress:
      process.env.NEXT_PUBLIC_FIXED_RATE_EXCHANGE_ADDRESS,
    dispenserAddress: process.env.NEXT_PUBLIC_DISPENSER_ADDRESS,
    oceanTokenAddress: process.env.NEXT_PUBLIC_OCEAN_TOKEN_ADDRESS,
    nftFactoryAddress: process.env.NEXT_PUBLIC_NFT_FACTORY_ADDRESS
  } as Config
}

export function getOceanConfig(network: string | number): Config {
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
  ) as Config
  if (network === 8996) {
    config = { ...config, ...sanitizeDevelopmentConfig(config) }
  }

  return config as Config
}

export function getDevelopmentConfig(): Config {
  return {
    // factoryAddress: contractAddresses.development?.DTFactory,
    // poolFactoryAddress: contractAddresses.development?.BFactory,
    // fixedRateExchangeAddress: contractAddresses.development?.FixedRateExchange,
    // metadataContractAddress: contractAddresses.development?.Metadata,
    // oceanTokenAddress: contractAddresses.development?.Ocean,
    // There is no subgraph in barge so we hardcode the Sepolia one for now
    subgraphUri: 'https://v4.subgraph.sepolia.oceanprotocol.com'
  } as Config
}

/**
 * getPaymentCollector - returns the current paymentCollector
 * @param chainId chain ID
 * @param datatokenAddress datatoken address
 * @return {Promise<string>}
 */
export async function getPaymentCollector(
  chainId: number,
  datatokenAddress: string
): Promise<string> {
  const signer = await getDummySigner(chainId)

  const datatoken = new Datatoken(signer, chainId)
  const paymentCollector = await datatoken.getPaymentCollector(datatokenAddress)

  return paymentCollector
}
