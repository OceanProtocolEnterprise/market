import AssetType from '@shared/AssetType'
import Time from '@shared/atoms/Time'
import Publisher from '@shared/Publisher'
import { ReactElement } from 'react'
import styles from './MetaInfo.module.css'
import { AssetExtended } from 'src/@types/AssetExtended'

function isAssetPublished(asset: AssetExtended): boolean {
  const nft = asset?.indexedMetadata?.nft
  const event = asset?.indexedMetadata?.event

  return Boolean(
    nft?.address &&
      nft?.created &&
      event?.txid &&
      event?.block &&
      event?.datetime
  )
}

export default function MetaInfo({
  asset,
  nftPublisher,
  verifiedServiceProviderName
}: {
  asset: AssetExtended
  nftPublisher: string
  verifiedServiceProviderName?: string
}): ReactElement {
  const nftOwner = asset?.indexedMetadata?.nft?.owner
  const isPublished = isAssetPublished(asset)

  return (
    <div className={styles.wrapper}>
      {' '}
      <AssetType
        type={asset?.credentialSubject?.metadata.type}
        variant="metadata"
        className={styles.assetType}
      />{' '}
      <div className={styles.byline}>
        {' '}
        <div>
          {isPublished ? (
            <>
              Published{' '}
              <Time date={asset?.indexedMetadata?.event?.datetime} relative />
              {(verifiedServiceProviderName ||
                (nftPublisher && nftPublisher !== nftOwner)) && (
                <span>
                  {' by '}{' '}
                  <Publisher
                    account={nftPublisher}
                    verifiedServiceProviderName={verifiedServiceProviderName}
                  />{' '}
                </span>
              )}
              {asset?.credentialSubject?.metadata.created !==
                asset?.credentialSubject?.metadata.updated && (
                <>
                  {' — '}{' '}
                  <span className={styles.updated}>
                    updated{' '}
                    <Time
                      date={asset?.credentialSubject?.metadata.updated}
                      relative
                    />{' '}
                  </span>
                </>
              )}
            </>
          ) : (
            <span>Not published yet</span>
          )}{' '}
        </div>{' '}
      </div>{' '}
    </div>
  )
}
