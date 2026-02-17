import { ReactElement, useState, useEffect } from 'react'
import MetaItem from './MetaItem'
import styles from './MetaFull.module.css'
import Publisher from '@shared/Publisher'
import { useAsset } from '@context/Asset'
import { LoggerInstance, Datatoken } from '@oceanprotocol/lib'
import { getDummySigner } from '@utils/wallet'
import { Asset } from 'src/@types/Asset'
import { IpfsRemoteSource } from '@components/@shared/IpfsRemoteSource'
import Label from '@components/@shared/FormInput/Label'
import { assetStateToString } from '@utils/assetState'

function truncateMiddle(
  value?: string,
  start = 6,
  end = 6
): string | undefined {
  if (!value) return value
  if (value.length <= start + end) return value
  return `${value.slice(0, start)}....${value.slice(-end)}`
}

export default function MetaFull({ ddo }: { ddo: Asset }): ReactElement {
  const { isInPurgatory, assetState } = useAsset()

  const effectiveAssetState =
    assetState ||
    (ddo?.indexedMetadata?.nft?.state !== undefined
      ? assetStateToString(ddo.indexedMetadata.nft.state)
      : 'Active')

  const [paymentCollector, setPaymentCollector] = useState<string>()
  const publisherDid = ddo?.issuer

  useEffect(() => {
    if (!ddo) return

    async function getInitialPaymentCollector() {
      try {
        const signer = await getDummySigner(ddo.credentialSubject?.chainId)
        const datatoken = new Datatoken(signer, ddo.credentialSubject?.chainId)
        setPaymentCollector(
          await datatoken.getPaymentCollector(
            ddo.indexedMetadata?.stats[0]?.datatokenAddress || ''
          )
        )
      } catch (error) {
        LoggerInstance.error(
          '[MetaFull: getInitialPaymentCollector]',
          error.message
        )
      }
    }
    getInitialPaymentCollector()
  }, [ddo])

  function DockerImage() {
    const containerInfo = ddo?.credentialSubject.metadata?.algorithm?.container
    const { image, tag } = containerInfo
    return <span>{`${image}:${tag}`}</span>
  }

  return ddo ? (
    <>
      <div className={styles.didContainer}>
        <MetaItem
          title="DID"
          content={
            <span className={styles.hoverReveal}>
              <code className={styles.truncated}>
                {truncateMiddle(ddo?.id, 12, 8)}
              </code>
              <span className={styles.fullValue}>{ddo?.id}</span>
            </span>
          }
        />
      </div>

      <div className={styles.metaFull}>
        {!isInPurgatory && (
          <span className={styles.dataAuther}>
            <MetaItem
              title="Data Author"
              content={ddo?.credentialSubject.metadata?.author}
            />
          </span>
        )}
        <MetaItem
          title="Owner"
          content={<Publisher account={ddo?.indexedMetadata?.nft?.owner} />}
        />
        {effectiveAssetState !== 'Active' && (
          <MetaItem title="Asset State" content={effectiveAssetState} />
        )}
        {paymentCollector &&
          paymentCollector !== ddo?.indexedMetadata?.nft?.owner && (
            <MetaItem
              title="Revenue Sent To"
              content={<Publisher account={paymentCollector} />}
            />
          )}
        {ddo?.credentialSubject.metadata?.type === 'algorithm' &&
          ddo?.credentialSubject.metadata?.algorithm && (
            <MetaItem title="Docker Image" content={<DockerImage />} />
          )}
        {publisherDid && (
          <MetaItem
            title="Publisher DID"
            content={
              <span className={styles.hoverReveal}>
                <code className={styles.truncated}>
                  {truncateMiddle(publisherDid, 12, 12)}
                </code>
                <span className={styles.fullValue}>{publisherDid}</span>
              </span>
            }
          />
        )}
      </div>

      <div className={styles.licenseRow}>
        <Label htmlFor="license">
          <span className={styles.licenceTitle}>License</span>
        </Label>
        {ddo.credentialSubject.metadata.license?.licenseDocuments?.[0]
          ?.mirrors?.[0]?.type === 'url' ? (
          <a
            target="_blank"
            href={
              ddo.credentialSubject.metadata.license.licenseDocuments[0]
                .mirrors[0].url
            }
            rel="noreferrer"
          >
            {ddo.credentialSubject.metadata.license.licenseDocuments[0].name}
          </a>
        ) : (
          <IpfsRemoteSource
            noDocumentLabel="No license document available"
            remoteSource={ddo.credentialSubject?.metadata?.license?.licenseDocuments
              ?.at(0)
              ?.mirrors?.at(0)}
          />
        )}
      </div>
    </>
  ) : null
}
