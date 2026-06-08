import Link from 'next/link'
import { ReactElement, useEffect, useState } from 'react'
import styles from './index.module.css'
import axios from 'axios'
import { useMarketMetadata } from '@context/MarketMetadata'
import { Asset } from 'src/@types/Asset'

export default function AssetListTitle({
  asset,
  did,
  title,
  openInNewTab,
  maxTitleLength = 16
}: {
  asset?: Asset
  did?: string
  title?: string
  openInNewTab?: boolean
  maxTitleLength?: number
}): ReactElement {
  const { appConfig } = useMarketMetadata()
  const [assetTitle, setAssetTitle] = useState<string>(title)
  const [assetTitleTrimmed, setAssetTitleTrimmed] = useState(title)
  useEffect(() => {
    if (title || !appConfig.metadataCacheUri) return
    if (asset) {
      const name = asset.credentialSubject?.metadata.name
      setAssetTitle(name)

      if (name.length > maxTitleLength) {
        setAssetTitleTrimmed(name.slice(0, maxTitleLength - 3) + '...')
        return
      }
      setAssetTitleTrimmed(name)
      return
    }

    const source = axios.CancelToken.source()

    async function getAssetName() {
      if (title.length > maxTitleLength) {
        setAssetTitleTrimmed(title.slice(0, maxTitleLength - 3) + '...')
      } else {
        setAssetTitleTrimmed(title)
      }
    }
    !asset && did && getAssetName()

    return () => {
      source.cancel()
    }
  }, [
    assetTitle,
    appConfig.metadataCacheUri,
    asset,
    did,
    maxTitleLength,
    title
  ])

  const assetId = did || asset?.id
  const assetHref = assetId ? `/asset/${assetId}` : undefined
  const titleContent = (
    <span className={styles.titleWrapper} title={assetTitle}>
      {assetTitleTrimmed}
    </span>
  )

  return (
    <span className={styles.title}>
      {assetHref ? (
        <Link
          href={assetHref}
          target={openInNewTab ? '_blank' : undefined}
          rel={openInNewTab ? 'noopener noreferrer' : undefined}
        >
          {titleContent}
        </Link>
      ) : (
        titleContent
      )}
    </span>
  )
}
