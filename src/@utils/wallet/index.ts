'use client'

import { LoggerInstance } from '@oceanprotocol/lib'
import { cookieStorage, createConfig, createStorage } from 'wagmi'
import { erc20Abi, http } from 'viem'
import { localhost, type Chain } from 'wagmi/chains'
import {
  ethers,
  Contract,
  formatEther,
  JsonRpcProvider,
  Provider,
  Wallet
} from 'ethers'
import { getOceanConfig } from '../ocean'
import { getSupportedChains } from './chains'
import { chainIdsSupported } from '../../../app.config.cjs'
import { getRuntimeConfig } from '../runtimeConfig'

export async function getDummySigner(chainId: number): Promise<Wallet> {
  const config = getOceanConfig(chainId)
  if (!config?.nodeUri) throw new Error('Missing nodeUri in Ocean config')

  const privateKey =
    '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'

  const provider = new JsonRpcProvider(config.nodeUri)

  return new Wallet(privateKey, provider)
}

/* -----------------------------------------
   WAGMI CHAINS — FIXED AS A TUPLE
------------------------------------------ */
function getWagmiChains(): readonly [Chain, ...Chain[]] {
  const baseChains: Chain[] = [...getSupportedChains(chainIdsSupported)]
  const runtimeConfig = getRuntimeConfig()

  if (runtimeConfig.NEXT_PUBLIC_MARKET_DEVELOPMENT === 'true') {
    baseChains.push({ ...localhost, id: 11155420 })
  }

  if (baseChains.length === 0) {
    throw new Error('No supported chains found for Wagmi config.')
  }

  return baseChains as unknown as readonly [Chain, ...Chain[]]
}

export const wagmiConfig = (() => {
  const chains = getWagmiChains()

  return createConfig({
    chains,
    ssr: true,
    storage: createStorage({ storage: cookieStorage }),
    connectors: [],
    transports: chains.reduce(
      (acc, chain) => ({
        ...acc,
        [chain.id]: http()
      }),
      {} as Record<number, ReturnType<typeof http>>
    )
  })
})()

// ConnectKit CSS overrides
// https://docs.family.co/connectkit/theming#theme-variables
export const connectKitTheme = {
  '--ck-font-family': 'var(--font-family-base)',
  '--ck-border-radius': 'var(--border-radius)',
  '--ck-overlay-background': 'var(--background-body-transparent)',
  '--ck-modal-box-shadow': '0 0 20px 20px var(--box-shadow-color)',
  '--ck-body-background': 'var(--background-body)',
  '--ck-body-color': '#000000',
  '--ck-primary-button-border-radius': 'var(--border-radius)',
  '--ck-primary-button-color': 'var(--font-color-heading)',
  '--ck-primary-button-background': 'var(--background-content)',
  '--ck-secondary-button-border-radius': 'var(--border-radius)',
  '--ck-body-color-muted': '#333333',
  '--ck-body-color-danger': '#ff3333'
}

export function accountTruncate(account: string): string {
  if (!account || account === '') return
  const middle = account.substring(6, 38)
  const truncated = account.replace(middle, '…')
  return truncated
}

export async function addTokenToWallet(
  address: string,
  symbol: string,
  decimals?: number,
  logo?: string
): Promise<void> {
  const image =
    logo ||
    'https://raw.githubusercontent.com/oceanprotocol/art/main/logo/token.png'

  const tokenMetadata = {
    type: 'ERC20',
    options: { address, symbol, image, decimals: decimals || 18 }
  }

  ;(window?.ethereum.request as any)(
    {
      method: 'wallet_watchAsset',
      params: tokenMetadata,
      id: Math.round(Math.random() * 100000)
    },
    (err: { code: number; message: string }, added: any) => {
      if (err || 'error' in added) {
        LoggerInstance.error(
          `Couldn't add ${tokenMetadata.options.symbol} (${
            tokenMetadata.options.address
          }) to MetaMask, error: ${err.message || added.error}`
        )
      } else {
        LoggerInstance.log(
          `Added ${tokenMetadata.options.symbol} (${tokenMetadata.options.address}) to MetaMask`
        )
      }
    }
  )
}

export async function getTokenBalance(
  accountId: string,
  decimals: number,
  tokenAddress: string,
  web3Provider: Provider
): Promise<string> {
  if (!web3Provider || !accountId || !tokenAddress) return

  try {
    const token = new Contract(tokenAddress, erc20Abi, web3Provider)
    const balance = await token.balanceOf(accountId)
    const balanceString = balance.toString()
    const adjustedDecimalsBalance = `${balanceString}${'0'.repeat(
      18 - decimals
    )}`

    return formatEther(adjustedDecimalsBalance)
  } catch (e: any) {
    LoggerInstance.error(`ERROR: Failed to get the balance: ${e.message}`)
  }
}

export function getTokenBalanceFromSymbol(
  balance: UserBalance,
  symbol: string
): string {
  if (!symbol) return

  return (
    balance?.[symbol.toLocaleLowerCase()] ||
    balance?.approved?.[symbol.toLocaleLowerCase()] ||
    '0'
  )
}

export async function getTokenInfo(
  tokenAddress: string,
  web3Provider: Provider
): Promise<TokenInfo> {
  if (!web3Provider || !tokenAddress || tokenAddress === ethers.ZeroAddress) {
    return {
      address: tokenAddress,
      name: 'Unknown',
      symbol: '???',
      decimals: 18
    }
  }
  const contract = new Contract(tokenAddress, erc20Abi, web3Provider)

  try {
    const nameFn = contract.getFunction('name')
    const symbolFn = contract.getFunction('symbol')
    const decimalsFn = contract.getFunction('decimals')

    const [nameRaw, symbolRaw, decimalsRaw] = await Promise.allSettled([
      nameFn.staticCall(),
      symbolFn.staticCall(),
      decimalsFn.staticCall()
    ])

    const safeString = (result: any): string => {
      if (!result) return 'Unknown'
      try {
        if (typeof result === 'string') {
          if (!result.startsWith('0x')) return result.trim() || 'Unknown'
          const bytes = ethers.hexlify(ethers.getBytes(result))
          return ethers.decodeBytes32String(bytes) || 'Unknown'
        }
        return 'Unknown'
      } catch {
        return 'Unknown'
      }
    }

    return {
      address: tokenAddress,
      name:
        nameRaw.status === 'fulfilled' ? safeString(nameRaw.value) : 'Unknown',
      symbol:
        symbolRaw.status === 'fulfilled' ? safeString(symbolRaw.value) : '???',
      decimals:
        decimalsRaw.status === 'fulfilled' ? Number(decimalsRaw.value) : 18
    }
  } catch (error) {
    LoggerInstance.error(`[getTokenInfo] Failed for ${tokenAddress}`, error)
    return {
      address: tokenAddress,
      name: 'Unknown Token',
      symbol: '???',
      decimals: 18
    }
  }
}
