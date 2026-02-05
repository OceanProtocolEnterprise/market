#!/usr/bin/env node
'use strict'

const bargeNetwork = {
  name: 'Ethereum Barge',
  chain: 'ETH',
  icon: 'ethereum',
  rpc: ['http://127.0.0.1:8545'],
  faucets: [],
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18
  },
  infoURL: 'https://ethereum.org',
  shortName: 'eth',
  chainId: 8996,
  networkId: 8996,
  slip44: 60,
  ens: {},
  explorers: []
}

const axios = require('axios')
const fs = require('fs')
const path = require('path')

const cachePath = path.join(
  __dirname,
  '..',
  'content',
  'networks-metadata.json'
)
const chainsConfigPath = path.join(__dirname, '..', 'chains.config.cjs')
const appConfigPath = path.join(__dirname, '..', 'app.config.cjs')

// https://github.com/ethereum-lists/chains
const chainDataUrl = 'https://chainid.network/chains.json'

const readCachedNetworks = () => {
  try {
    const cached = fs.readFileSync(cachePath, 'utf8').trim()
    if (!cached) return null
    return JSON.parse(cached)
  } catch (error) {
    return null
  }
}

const buildFallbackNetworks = () => {
  const fallback = new Map()

  const defaultCurrency = {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18
  }

  const addFallback = (chainId, data) => {
    fallback.set(chainId, {
      name: data.name,
      chain: data.chain || 'ETH',
      shortName: data.shortName || String(chainId),
      chainId,
      networkId: chainId,
      nativeCurrency: data.nativeCurrency || defaultCurrency,
      rpc: data.rpc || [],
      infoURL: data.infoURL || '',
      faucets: data.faucets || [],
      explorers: data.explorers || []
    })
  }

  // Minimal known chains used by the app config.
  addFallback(1, {
    name: 'Ethereum Mainnet',
    chain: 'ETH',
    shortName: 'eth',
    infoURL: 'https://ethereum.org'
  })
  addFallback(10, {
    name: 'OP Mainnet',
    chain: 'OP',
    shortName: 'op',
    infoURL: 'https://optimism.io'
  })
  addFallback(11155111, {
    name: 'Sepolia Testnet',
    chain: 'ETH',
    shortName: 'sep',
    infoURL: 'https://ethereum.org'
  })
  addFallback(11155420, {
    name: 'OP Sepolia Testnet',
    chain: 'OP',
    shortName: 'opsepolia',
    infoURL: 'https://optimism.io'
  })
  addFallback(8996, {
    name: 'Development Testnet',
    chain: 'ETH',
    shortName: 'dev',
    infoURL: 'https://ethereum.org'
  })

  try {
    const { chains } = require(chainsConfigPath)
    const titleize = (value) =>
      value
        .split(/[-_]/)
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase() + part.slice(1))
        .join(' ')

    chains.forEach((chain) => {
      const isTestnet =
        typeof chain.network === 'string' &&
        (chain.network.includes('testnet') || chain.network.includes('devnet'))
      const baseName = chain.network
        ? titleize(chain.network)
        : `Chain ${chain.chainId}`
      const name =
        isTestnet && !baseName.includes('Testnet')
          ? `${baseName} Testnet`
          : baseName
      const explorers = chain.explorerUri
        ? [
            {
              name: 'Explorer',
              url: chain.explorerUri,
              standard: 'EIP3091'
            }
          ]
        : []
      addFallback(chain.chainId, {
        name,
        chain: 'ETH',
        shortName: chain.network
          ? chain.network.slice(0, 10)
          : String(chain.chainId),
        rpc: chain.nodeUri ? [chain.nodeUri] : [],
        infoURL: chain.explorerUri || '',
        explorers
      })
    })
  } catch (error) {
    // Ignore if config can't be loaded.
  }

  try {
    const appConfig = require(appConfigPath)
    if (Array.isArray(appConfig.chainIdsSupported)) {
      appConfig.chainIdsSupported.forEach((chainId) => {
        if (!fallback.has(chainId)) {
          addFallback(chainId, {
            name: `Chain ${chainId}`,
            chain: 'ETH',
            shortName: String(chainId)
          })
        }
      })
    }
  } catch (error) {
    // Ignore if config can't be loaded.
  }

  return Array.from(fallback.values())
}

const shouldSkipFetch =
  process.env.OFFLINE === 'true' || process.env.SKIP_NETWORK_METADATA === 'true'

const writeNetworks = (networks) => {
  process.stdout.write(JSON.stringify(networks, null, '  '))
}

const handleFallback = () => {
  const cachedNetworks = readCachedNetworks()
  if (
    cachedNetworks &&
    Array.isArray(cachedNetworks) &&
    cachedNetworks.length > 0
  ) {
    writeNetworks(cachedNetworks)
    return
  }

  const fallbackNetworks = buildFallbackNetworks()
  writeNetworks(fallbackNetworks)
}

if (shouldSkipFetch) {
  handleFallback()
} else {
  axios(chainDataUrl, { timeout: 8000 })
    .then((response) => {
      const networkData = response.data
      networkData.push(bargeNetwork)
      writeNetworks(networkData)
    })
    .catch(() => {
      handleFallback()
    })
}
