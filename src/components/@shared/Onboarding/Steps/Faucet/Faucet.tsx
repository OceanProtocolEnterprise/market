import { ReactElement } from 'react'
import { useChainId } from 'wagmi'
import Image from 'next/image'

import { OnboardingStep } from '../..'
import content from '../../../../../../content/onboarding/steps/faucet.json'
import StepHeader from '../../StepHeader'

import USDCIcon from '@images/USDC_Token_Logo.svg'
import EURCIcon from '@images/EURC_Token_Logo.svg'
import ETHIcon from '@images/eth.svg'
import KrakenIcon from '@images/exchanges/kraken.svg'
import CryptoComIcon from '@images/exchanges/crypto-com.svg'
import ByBitIcon from '@images/exchanges/bybit.svg'
import BitpandaIcon from '@images/exchanges/bitpanda.svg'
import OKXIcon from '@images/exchanges/okx.svg'
import CoinbaseIcon from '@images/exchanges/coinbase.svg'

import styles from './index.module.css'

const EXCHANGE_ICONS: Record<string, any> = {
  Kraken: KrakenIcon,
  'Crypto.com': CryptoComIcon,
  ByBit: ByBitIcon,
  Bitpanda: BitpandaIcon,
  OKX: OKXIcon,
  Coinbase: CoinbaseIcon
}

interface FaucetLinkType {
  label: string
  url: string
  icon?: string | any
}

interface NetworkFaucets {
  name: string
  isTestnet: boolean
  gas?: FaucetLinkType[]
  tokens?: FaucetLinkType[]
  productionInfo?: string
}

const FAUCETS_BY_CHAIN: Record<number, NetworkFaucets> = {
  11155111: {
    name: 'Ethereum Sepolia',
    isTestnet: true,
    gas: [
      {
        label: 'ETH Sepolia Faucet',
        url: 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia',
        icon: ETHIcon
      }
    ],
    tokens: [
      { label: 'EURC', url: 'https://faucet.circle.com/', icon: EURCIcon },
      { label: 'USDC', url: 'https://faucet.circle.com/', icon: USDCIcon },
      { label: 'EURAU', url: '', icon: undefined }
    ]
  },
  11155420: {
    name: 'Optimism Sepolia',
    isTestnet: true,
    gas: [
      {
        label: 'OP Sepolia Faucet',
        url: 'https://www.alchemy.com/faucets/optimism-sepolia',
        icon: ETHIcon
      }
    ],
    tokens: [
      { label: 'USDC', url: 'https://faucet.circle.com/', icon: USDCIcon }
    ]
  },
  1: {
    name: 'Ethereum Mainnet',
    isTestnet: false
  },
  10: {
    name: 'Optimism Mainnet',
    isTestnet: false
  },
  137: {
    name: 'Polygon Mainnet',
    isTestnet: false
  },
  56: {
    name: 'BNB Smart Chain',
    isTestnet: false
  },
  43114: {
    name: 'Avalanche C-Chain',
    isTestnet: false
  }
}

const TokenIcon = ({ icon, label }: { icon?: string | any; label: string }) => {
  if (!icon) {
    return (
      <div className={styles.iconWrapper}>
        <span className={styles.fallbackIcon}>🪙</span>
      </div>
    )
  }

  return (
    <div className={styles.iconWrapper}>
      {typeof icon === 'string' || icon?.src ? (
        <Image
          src={icon?.src || icon}
          alt={label}
          width={24}
          height={24}
          className={styles.icon}
        />
      ) : (
        <div className={styles.iconComponent}>
          {typeof icon === 'function' ? icon({}) : null}
        </div>
      )}
    </div>
  )
}

const ExchangeIcon = ({
  icon,
  name
}: {
  icon?: string | any
  name: string
}) => {
  if (!icon) {
    return (
      <div className={styles.exchangeIconWrapper}>
        <span className={styles.fallbackIcon}>🏦</span>
      </div>
    )
  }

  if (typeof icon === 'function') {
    return (
      <div className={styles.exchangeIconWrapper}>
        <div className={styles.exchangeIconContainer}>
          {icon({ className: styles.exchangeSvg })}
        </div>
      </div>
    )
  }
  return (
    <div className={styles.exchangeIconWrapper}>
      <div className={styles.exchangeIconContainer}>
        <Image
          src={icon?.src || icon}
          alt={name}
          width={40}
          height={40}
          className={styles.exchangeSvg}
          style={{ objectFit: 'contain' }}
        />
      </div>
    </div>
  )
}

const FaucetLink = ({ label, url, icon }: FaucetLinkType): ReactElement => (
  <div className={styles.row}>
    <TokenIcon icon={icon} label={label} />
    <div className={styles.linkContainer}>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          {label}
        </a>
      ) : (
        <span className={styles.disabled}>
          {label} <small className={styles.comingSoon}>(coming soon)</small>
        </span>
      )}
    </div>
  </div>
)

const ExchangeLink = ({
  name,
  url
}: {
  name: string
  url: string
}): ReactElement => {
  const icon = EXCHANGE_ICONS[name]

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.exchangeCard}
    >
      <ExchangeIcon icon={icon} name={name} />
      <span className={styles.exchangeName}>{name}</span>
      <span className={styles.externalLinkIcon}>↗</span>
    </a>
  )
}

const TestnetView = ({
  network,
  body
}: {
  network: NetworkFaucets
  body: string
}): ReactElement => (
  <div className={styles.testnetContainer}>
    <p className={styles.mainnetNote}>{body}</p>
    <div className={styles.faucetGroups}>
      {network.gas && (
        <details className={styles.dropdown} open>
          <summary className={styles.summary}>
            <div className={styles.summaryLabel}>
              <span className={styles.emoji}>⛽</span>
              <span>Gas Faucets</span>
            </div>
            <div className={styles.chevron} />
          </summary>
          <div className={styles.content}>
            {network.gas.map((faucet) => (
              <FaucetLink key={faucet.label} {...faucet} />
            ))}
          </div>
        </details>
      )}

      {network.tokens && (
        <details className={styles.dropdown} open>
          <summary className={styles.summary}>
            <div className={styles.summaryLabel}>
              <span className={styles.emoji}>🪙</span>
              <span>Token Faucets</span>
            </div>
            <div className={styles.chevron} />
          </summary>
          <div className={styles.content}>
            {network.tokens.map((token) => (
              <FaucetLink key={token.label} {...token} />
            ))}
          </div>
        </details>
      )}
    </div>
  </div>
)

const MainnetView = ({ content }: { content: any }): ReactElement => (
  <div className={styles.mainnetContainer}>
    <div className={styles.mainnetNote}>{content.body}</div>
    <div className={styles.exchangesGrid}>
      {content.exchanges.map((exchange: any) => (
        <ExchangeLink
          key={exchange.name}
          name={exchange.name}
          url={exchange.url}
        />
      ))}
    </div>
  </div>
)

export default function Faucet(): ReactElement {
  const chainId = useChainId()
  const network = chainId ? FAUCETS_BY_CHAIN[chainId] : undefined

  const isMainnet = network && !network.isTestnet
  const stepContent = isMainnet ? content.mainnet : content.testnet
  const { title, subtitle, body } = stepContent

  return (
    <div className={styles.wrapper}>
      <StepHeader title={title} subtitle={subtitle} />

      <div className={styles.scrollableContent}>
        {!network && (
          <div className={styles.errorContainer}>
            <p className={styles.error}>
              ❌ Please connect to a supported network.
            </p>
          </div>
        )}

        {network?.isTestnet && <TestnetView network={network} body={body} />}

        {isMainnet && <MainnetView content={content.mainnet} />}
      </div>
    </div>
  )
}
