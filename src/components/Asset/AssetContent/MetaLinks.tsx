import { ReactElement } from 'react'
import MetaItem from './MetaItem'
import External from '@images/external.svg'
import { safeExternalWebUrl } from '@utils/url'
import styles from './MetaLinks.module.css'

export default function MetaLinks({
  links
}: {
  links?: Record<string, string>
}): ReactElement | null {
  // `metadata.links` is a title -> URL map of related links (website, demo, ...)
  const entries = Object.entries(links || {}).filter(
    ([title, url]) => title?.trim() && url?.trim()
  )

  if (entries.length === 0) return null

  return (
    <div className={styles.section}>
      <MetaItem
        title="Links"
        content={
          <ul className={styles.list}>
            {entries.map(([title, url]) => (
              <li key={title}>
                <a
                  className={styles.chip}
                  href={safeExternalWebUrl(url)}
                  target="_blank"
                  rel="noreferrer"
                  title={url}
                >
                  <span className={styles.text}>{title}</span>
                  <External className={styles.icon} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        }
      />
    </div>
  )
}
