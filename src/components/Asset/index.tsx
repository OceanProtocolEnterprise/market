import { useState, useEffect, ReactElement } from 'react'
import { useRouter } from 'next/router'
import Page from '@shared/Page'
import Alert from '@shared/atoms/Alert'
import { useAsset } from '@context/Asset'
import AssetContent from './AssetContent'
import AssetDetailsSkeleton from './Skeleton'

export default function AssetDetails({ uri }: { uri: string }): ReactElement {
  const router = useRouter()
  const { asset, title, error, isInPurgatory, loading } = useAsset()
  const [pageTitle, setPageTitle] = useState<string>()

  useEffect(() => {
    if (!asset || error) {
      setPageTitle(title || 'Could not retrieve asset')
      return
    }
    setPageTitle(isInPurgatory ? '' : title)
  }, [asset, error, isInPurgatory, router, title, uri])

  return asset && pageTitle !== undefined && !loading ? (
    <Page title={pageTitle} uri={uri}>
      <AssetContent asset={asset} />
    </Page>
  ) : error ? (
    <Page title={pageTitle} noPageHeader uri={uri}>
      <Alert title={pageTitle} text={error} state={'error'} />
    </Page>
  ) : (
    <Page title=" " uri={uri}>
      <AssetDetailsSkeleton />
    </Page>
  )
}
