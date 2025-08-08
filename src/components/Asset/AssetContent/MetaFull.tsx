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

export default function MetaFull({ ddo }: { ddo: Asset }): ReactElement {
  const { isInPurgatory, assetState } = useAsset()

  const effectiveAssetState =
    assetState ||
    (ddo?.indexedMetadata?.nft?.state !== undefined
      ? assetStateToString(ddo.indexedMetadata.nft.state)
      : 'Active')

  const [paymentCollector, setPaymentCollector] = useState<string>()

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
        <MetaItem title="DID" content={<code>{ddo?.id}</code>} />
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
