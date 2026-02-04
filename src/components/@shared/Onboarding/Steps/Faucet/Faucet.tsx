import { ReactElement } from 'react'
import { useChainId } from 'wagmi'
import Image from 'next/image' // Using Next.js Image for better optimization

import { OnboardingStep } from '../..'
import content from '../../../../../../content/onboarding/steps/faucet.json'
import StepBody from '../../StepBody'
import StepHeader from '../../StepHeader'

// SVG Icons
import USDCIcon from '@images/USDC_Token_Logo.svg'
import EURCIcon from '@images/EURC_Token_Logo.svg'
import ETHIcon from '@images/eth.svg'

import styles from './index.module.css'

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
    isTestnet: false,
    productionInfo:
      'This is a production network. Acquire ETH and tokens from major exchanges.'
  }
}

/**
 * Fixed TokenIcon component.
 * Handles the "undefined" error by checking if icon is a string or a component.
 */
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
      {/* If icon is a string, it's a URL path. 
          If it's an object/function, it's a React component (SVGR).
      */}
      {typeof icon === 'string' || icon?.src ? (
        <Image
          src={icon?.src || icon}
          alt={label}
          width={24}
          height={24}
          className={styles.icon}
        />
      ) : (
        /* If your SVG loader provides a component, render it directly */
        <div className={styles.iconComponent}>
          {typeof icon === 'function' ? icon({}) : null}
        </div>
      )}
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

export default function Faucet(): ReactElement {
  const { title, subtitle, body, image }: OnboardingStep = content
  const chainId = useChainId()
  const network = chainId ? FAUCETS_BY_CHAIN[chainId] : undefined

  return (
    <div>
      <StepHeader title={title} subtitle={subtitle} />
      <StepBody body={body} image={image}>
        <div className={styles.container}>
          {!network && (
            <p className={styles.error}>
              ❌ Please connect to a supported network.
            </p>
          )}

          {network?.isTestnet && (
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
          )}

          {!network?.isTestnet && network?.productionInfo && (
            <div className={styles.prodBox}>
              <strong>Notice:</strong> {network.productionInfo}
            </div>
          )}
        </div>
      </StepBody>
    </div>
  )
}
