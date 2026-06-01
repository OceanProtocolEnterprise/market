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
  openInNewTab
}: {
  asset?: Asset
  did?: string
  title?: string
  openInNewTab?: boolean
}): ReactElement {
  const { appConfig } = useMarketMetadata()
  const [assetTitle, setAssetTitle] = useState<string>(title)
  const [assetTitleTrimmed, setAssetTitleTrimmed] = useState(title)
  useEffect(() => {
    if (title || !appConfig.metadataCacheUri) return
    if (asset) {
      const name = asset.credentialSubject?.metadata.name
      setAssetTitle(name)

      if (name.length > 16) {
        setAssetTitleTrimmed(name.slice(0, 13) + '...')
        return
      }
      setAssetTitleTrimmed(name)
      return
    }

    const source = axios.CancelToken.source()

    async function getAssetName() {
      if (title.length > 16) {
        setAssetTitleTrimmed(title.slice(0, 13) + '...')
      } else {
        setAssetTitleTrimmed(title)
      }
    }
    !asset && did && getAssetName()

    return () => {
      source.cancel()
    }
  }, [assetTitle, appConfig.metadataCacheUri, asset, did, title])

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
