import Link from 'next/link'
import { ReactElement, useEffect, useState } from 'react'
import { getAssetsNames } from '@utils/aquarius'
import styles from './index.module.css'
import axios from 'axios'
import { useMarketMetadata } from '@context/MarketMetadata'
import { Asset } from 'src/@types/Asset'

export default function AssetListTitle({
  asset,
  did,
  title
}: {
  asset?: Asset
  did?: string
  title?: string
}): ReactElement {
  const { appConfig } = useMarketMetadata()
  const [assetTitle, setAssetTitle] = useState<string>(title)

  useEffect(() => {
    if (title || !appConfig.metadataCacheUri) return
    if (asset) {
      setAssetTitle(asset.credentialSubject?.metadata.name)
      return
    }

    const source = axios.CancelToken.source()

    async function getAssetName() {
      const title = await getAssetsNames([did], source.token)
      setAssetTitle(title[did])
    }

    !asset && did && getAssetName()

    return () => {
      source.cancel()
    }
  }, [assetTitle, appConfig.metadataCacheUri, asset, did, title])

  return (
    <span className={styles.title}>
      <Link href={`/asset/${did || asset?.id}`}>
        <span className={styles.titleWrapper} title={assetTitle}>
          {assetTitle}
        </span>
      </Link>
    </span>
  )
}
