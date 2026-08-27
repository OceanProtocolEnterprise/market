import { ReactElement } from 'react'
import { useUserPreferences } from '@context/UserPreferences'
import styles from './Links.module.css'
import { useMarketMetadata } from '@context/MarketMetadata'
import Link from 'next/link'

interface CookieSettingsButtonProps {
  onClick: () => void
}

function CookieSettingsButton({
  onClick
}: CookieSettingsButtonProps): ReactElement {
  return (
    <button type="button" className={styles.linkButton} onClick={onClick}>
      Cookie Settings
    </button>
  )
}

export default function Links(): ReactElement {
  const { appConfig, siteContent } = useMarketMetadata()
  const { setShowPPC } = useUserPreferences()

  const { content, privacyTitle } = siteContent.footer
  const showCookieSettings = appConfig.privacyPreferenceCenter === 'true'
  const openCookieSettings = () => setShowPPC(true)

  return (
    <div className={styles.container}>
      {content?.map(
        (section) =>
          section.title !== 'Privacy' && (
            <div key={section.title} className={styles.section}>
              <p className={styles.title}>{section.title}</p>
              <div className={styles.links}>
                {section.links.map((e) => {
                  if (e.name === 'Cookie Settings') {
                    return showCookieSettings ? (
                      <CookieSettingsButton
                        key={`${e.name}-${e.link}`}
                        onClick={openCookieSettings}
                      />
                    ) : null
                  }
                  if (e.name === 'Cookie Policy') {
                    return (
                      <Link
                        key={`${e.name}-${e.link}`}
                        className={styles.link}
                        href="/privacy/cookie-policy"
                      >
                        Cookie Policy
                      </Link>
                    )
                  }
                  if (e.name === 'Privacy') {
                    return (
                      <Link
                        key={`${e.name}-${e.link}`}
                        className={styles.link}
                        href="/privacy/privacy-policy"
                      >
                        {e.name}
                      </Link>
                    )
                  }
                  if (e.name === 'Imprint') {
                    return (
                      <Link
                        key={`${e.name}-${e.link}`}
                        className={styles.link}
                        href="/privacy/imprint"
                      >
                        {e.name}
                      </Link>
                    )
                  }
                  const isInternalLink = e.link.startsWith('/')
                  return isInternalLink ? (
                    <Link
                      key={`${e.name}-${e.link}`}
                      className={styles.link}
                      href={e.link}
                    >
                      {e.name === 'Log' ? (
                        <>
                          <span>Log</span>
                          <span className={styles.logIcon}>&nbsp;↗</span>{' '}
                        </>
                      ) : (
                        e.name
                      )}
                    </Link>
                  ) : (
                    <a
                      key={`${e.name}-${e.link}`}
                      className={styles.link}
                      href={e.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {e.name === 'Log' ? (
                        <>
                          <span>Log</span>
                          <span className={styles.logIcon}>&nbsp;↗</span>{' '}
                        </>
                      ) : (
                        e.name
                      )}
                    </a>
                  )
                })}
              </div>
            </div>
          )
      )}
      <div className={styles.section}>
        <p className={styles.title}>{privacyTitle}</p>
        <div className={styles.links}>
          <Link className={styles.link} href="/privacy/imprint">
            Imprint
          </Link>
          <Link className={styles.link} href="/privacy/terms">
            Terms & Conditions
          </Link>
          <Link className={styles.link} href="/privacy/privacy-policy">
            Privacy Policy
          </Link>
          <Link
            className={styles.link}
            href="/privacy/data-portal-usage-agreement"
          >
            Data Portal Usage Agreement
          </Link>

          <Link className={styles.link} href="/privacy/cookie-policy">
            Cookie Policy
          </Link>
          {showCookieSettings && (
            <CookieSettingsButton onClick={openCookieSettings} />
          )}
        </div>
      </div>
    </div>
  )
}
