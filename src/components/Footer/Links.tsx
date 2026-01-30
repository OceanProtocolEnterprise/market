import { ReactElement } from 'react'
import { useUserPreferences } from '@context/UserPreferences'
import { useGdprMetadata } from '@hooks/useGdprMetadata'
import styles from './Links.module.css'
import { useMarketMetadata } from '@context/MarketMetadata'
import Link from 'next/link'

export default function Links(): ReactElement {
  const { appConfig, siteContent } = useMarketMetadata()
  const { setShowPPC, privacyPolicySlug } = useUserPreferences()
  const cookies = useGdprMetadata()

  const { content, privacyTitle } = siteContent.footer

  return (
    <div className={styles.container}>
      {content?.map(
        (section, i) =>
          section.title !== 'Privacy' && (
            <div key={i} className={styles.section}>
              <p className={styles.title}>{section.title}</p>
              <div className={styles.links}>
                {section.links.map((e, i) => {
                  if (e.name === 'Cookie Settings') {
                    return (
                      <Link
                        key={i}
                        className={styles.link}
                        href="/cookie-settings"
                        onClick={() => {
                          setShowPPC(true)
                        }}
                      >
                        {cookies.optionalCookies
                          ? 'Cookie Settings'
                          : 'Cookies'}
                      </Link>
                    )
                  }
                  if (e.name === 'Imprint' || e.name === 'Privacy') {
                    return (
                      <Link key={i} className={styles.link} href={e.link}>
                        {e.name}
                      </Link>
                    )
                  }
                  const isInternalLink = e.link.startsWith('/')
                  return isInternalLink ? (
                    <Link key={i} className={styles.link} href={e.link}>
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
                      key={i}
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
          <Link className={styles.link} href="/imprint">
            Imprint
          </Link>
          <Link
            className={styles.link}
            href={`${privacyPolicySlug}#terms-and-conditions`}
          >
            Terms & Conditions
          </Link>
          <Link
            className={styles.link}
            href={`${privacyPolicySlug}#privacy-policy`}
          >
            Privacy Policy
          </Link>
          <Link
            className={styles.link}
            href={`${privacyPolicySlug}#data-portal-usage-agreement`}
          >
            Data Portal Usage Agreement
          </Link>

          {appConfig.privacyPreferenceCenter === 'true' && (
            <Link
              className={styles.link}
              href="/cookie-settings"
              onClick={() => {
                setShowPPC(true)
              }}
            >
              {cookies.optionalCookies ? 'Cookie Settings' : 'Cookies'}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
