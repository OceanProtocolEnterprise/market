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

  const handleImageClick = () => {
    if (isValidUrl) {
      window.open(ssiUiUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className={styles.wrapper}>
      <StepHeader title={title} subtitle={subtitle} />

      <div className={styles.content}>
        <div className={styles.textSection}>
          {/* <p className={styles.description}>{body}</p> */}

          {/* {isValidUrl && (
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
          )} */}

          <div className={styles.infoBox}>
            <h4 className={styles.heading}>
              To set up the SSI Wallet provided by Ocean Enterprise follow these
              steps:
            </h4>

            <div className={styles.stepsList}>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>Step 1.</span>
                <span className={styles.stepText}>
                  Access your company SSI Wallet interface
                </span>
              </div>
              <div className={styles.stepItem}>
                <span className={styles.stepNumber}>Step 2.</span>
                <span className={styles.stepText}>
                  Configure the DIDs and Verifiable Credentials
                </span>
              </div>
            </div>
          </div>

          <div className={styles.linksSection}>
            <h4 className={styles.linksHeading}>Learn More:</h4>
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
        </div>

        {image && (
          <div className={styles.imageWrapper}>
            <div
              onClick={isValidUrl ? handleImageClick : undefined}
              role={isValidUrl ? 'button' : 'presentation'}
              tabIndex={isValidUrl ? 0 : -1}
              onKeyDown={(e) => {
                if (isValidUrl && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  handleImageClick()
                }
              }}
              className={isValidUrl ? styles.clickableContainer : undefined}
            >
              <Image
                src={image}
                alt="SSI Wallet"
                width={420}
                height={320}
                className={`${styles.image} ${
                  !isValidUrl ? styles.staticImage : ''
                }`}
                priority
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
