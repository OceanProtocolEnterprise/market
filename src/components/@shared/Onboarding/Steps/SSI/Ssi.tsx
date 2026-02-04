import { ReactElement } from 'react'
import Image from 'next/image'

import { OnboardingStep } from '../..'
import StepHeader from '../../StepHeader'
import content from '../../../../../../content/onboarding/steps/ssi.json'

import styles from './index.module.css'

export default function SSIWallet(): ReactElement {
  const { title, subtitle, body, image }: OnboardingStep = content

  return (
    <div className={styles.wrapper}>
      <StepHeader title={title} subtitle={subtitle} />

      <div className={styles.content}>
        <div className={styles.textSection}>
          <p className={styles.description}>{body}</p>

          <div className={styles.infoBox}>
            <h4 className={styles.heading}>Why use an SSI Wallet?</h4>
            <p className={styles.text}>
              SSI wallets enable privacy-preserving access to identity-based
              features by allowing you to present verifiable credentials only
              when required, without exposing unnecessary personal information.
            </p>
          </div>

          <div className={styles.links}>
            <a
              href="https://docs.oceanenterprise.io/user-guides/using-the-oe-marketplace/onboarding-to-the-marketplace/setting-up-the-ssi-wallet"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.primaryLink}
            >
              📘 Read the SSI Wallet documentation
            </a>

            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.secondaryLink}
            >
              🎥 Watch the SSI Wallet setup video
            </a>
          </div>
        </div>

        {image && (
          <div className={styles.imageWrapper}>
            <Image
              src={image}
              alt="SSI Wallet"
              width={420}
              height={320}
              className={styles.image}
              priority
            />
          </div>
        )}
      </div>
    </div>
  )
}
