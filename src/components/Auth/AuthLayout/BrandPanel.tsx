import Logo from '@images/logo.svg'
import appConfig from 'app.config.cjs'
import { authBrandDefaults, type AuthPanelContent } from '../constants'
import { BrandPanelIcon, BrandPanelWaves } from './BrandPanelArtwork'
import styles from './BrandPanel.module.css'

interface BrandPanelProps {
  content: AuthPanelContent
}

export default function BrandPanel({ content }: BrandPanelProps) {
  const title = content.title || authBrandDefaults.title
  const description = content.description || authBrandDefaults.description
  const featureItems = content.features || authBrandDefaults.features
  const trustBadges = authBrandDefaults.trustBadges.filter(
    (badge) => appConfig.ssiEnabled || badge !== 'SSI Verification'
  )

  return (
    <div className={styles.brandPanel}>
      <div className={styles.waves}>
        <BrandPanelWaves className={styles.wavesSvg} />
      </div>

      <div className={styles.content}>
        <div className={styles.top}>
          <div className={styles.logoWrapper}>
            <Logo />
          </div>
        </div>

        <div className={styles.middle}>
          <h1 className={styles.title}>{title}</h1>

          <p className={styles.description}>{description}</p>

          <div className={styles.features}>
            {featureItems.map((feature, index) => (
              <div key={index} className={styles.feature}>
                <div className={styles.featureIcon}>
                  <BrandPanelIcon
                    variant={feature.icon}
                    width="16"
                    height="16"
                  />
                </div>
                <span className={styles.featureText}>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.trustLabel}>{authBrandDefaults.trustLabel}</p>
          <div className={styles.badges}>
            {trustBadges.map((badge) => (
              <span key={badge} className={styles.badge}>
                {badge}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
