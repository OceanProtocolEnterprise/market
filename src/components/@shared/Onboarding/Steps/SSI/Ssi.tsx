import { ReactElement } from 'react'
import Image from 'next/image'

import { OnboardingStep } from '../..'
import StepHeader from '../../StepHeader'
import content from '../../../../../../content/onboarding/steps/ssi.json'

import styles from './index.module.css'

export default function SSIWallet(): ReactElement {
  const { title, subtitle, body, image }: OnboardingStep = content

  const ssiUiUrl = process.env.NEXT_PUBLIC_SSI_UI_URL
  const isValidUrl =
    typeof ssiUiUrl === 'string' && /^(https?:\/\/)/i.test(ssiUiUrl)

  return (
    <div className={styles.wrapper}>
      <StepHeader title={title} subtitle={subtitle} />

      <div className={styles.content}>
        <div className={styles.textSection}>
          <p className={styles.description}>{body}</p>

          {isValidUrl && (
            <p className={styles.description}>
              To use the SSI wallet provided by the marketplace operator, access{' '}
              <a
                href={ssiUiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.primaryLink}
              >
                this link
              </a>
            </p>
          )}

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
              className={styles.secondaryLink}
              aria-disabled="true"
              onClick={(e) => e.preventDefault()}
            >
              🎥 Watch the SSI Wallet setup video (coming soon)
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
