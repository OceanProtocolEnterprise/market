import { ReactElement } from 'react'
import Link from 'next/link'
import styles from './index.module.css'

export interface TagsProps {
  items: string[]
  max?: number
  showMore?: boolean
  className?: string
  noLinks?: boolean
}

const Tag = ({ tag, noLinks }: { tag: string; noLinks?: boolean }) => {
  const urlEncodedTag = encodeURIComponent(tag)
  return noLinks ? (
    <span className={styles.tag}>{tag}</span>
  ) : (
    <Link
      href={`/search?tags=${urlEncodedTag}&sort=credentialSubject.nft.created&sortOrder=desc`}
      className={styles.tag}
      title={tag}
    >
      {tag}
    </Link>
  )
}

export default function Tags({
  items,
  max,
  showMore,
  className,
  noLinks
}: TagsProps): ReactElement {
  // safeguard against faults in the metadata
  if (!(items instanceof Array)) return null

  max = max || items.length
  const remainder = items.length - max
  // filter out empty array items, and restrict to `max`
  const tags = items?.filter((tag) => tag !== '').slice(0, max)
  const shouldShowMore = showMore && remainder > 0
  const classes = className ? `${styles.tags} ${className}` : styles.tags

  return (
    <div className={classes}>
      <span className={styles.title}>Tags:</span>
      {tags?.map((tag, i) => (
        <span key={tag + i}>
          <Tag tag={tag} noLinks={noLinks} />
          {i < tags.length - 1 && <span>, </span>}
        </span>
      ))}
      {shouldShowMore && (
        <span className={styles.more}>{`+ ${items.length - max} more`}</span>
      )}
    </div>
  )
}
