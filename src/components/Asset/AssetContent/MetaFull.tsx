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
import { safeExternalWebUrl } from '@utils/url'
import AdditionalLicenseFiles from './AdditionalLicenseFiles'
import MetaLinks from './MetaLinks'
import TruncatedMetaValue from './TruncatedMetaValue'

export default function MetaFull({ ddo }: { ddo: Asset }): ReactElement {
  const { isInPurgatory, assetState } = useAsset()
  const credentialSubject = ddo?.credentialSubject
  const metadata = credentialSubject?.metadata
  const license = credentialSubject?.license || metadata?.license
  const primaryLicenseDocument = license?.licenseDocuments?.[0]
  const primaryLicenseMirror = primaryLicenseDocument?.mirrors?.[0]
  const oeNode = credentialSubject?.services?.[0]?.serviceEndpoint
  const datatokenAddress =
    ddo?.indexedMetadata?.stats?.[0]?.datatokenAddress ||
    credentialSubject?.datatokens?.[0]?.address
  const algorithmContainer = metadata?.algorithm?.container
  const dockerImage =
    algorithmContainer?.image && algorithmContainer?.tag
      ? `${algorithmContainer.image}:${algorithmContainer.tag}`
      : undefined

  const effectiveAssetState =
    assetState ||
    (ddo?.indexedMetadata?.nft?.state !== undefined
      ? assetStateToString(ddo.indexedMetadata.nft.state)
      : 'Active')

  const [paymentCollector, setPaymentCollector] = useState<string>()
  const publisherDid = ddo?.issuer

  useEffect(() => {
    if (!ddo) {
      setPaymentCollector(undefined)
      return
    }

    let isCancelled = false
    setPaymentCollector(undefined)

    async function getInitialPaymentCollector() {
      try {
        if (!datatokenAddress) return

        const signer = await getDummySigner(credentialSubject?.chainId)
        const datatoken = new Datatoken(signer, credentialSubject?.chainId)
        const nextPaymentCollector = await datatoken.getPaymentCollector(
          datatokenAddress
        )
        if (!isCancelled) setPaymentCollector(nextPaymentCollector)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        LoggerInstance.error('[MetaFull: getInitialPaymentCollector]', message)
      }
    }
    getInitialPaymentCollector()

    return () => {
      isCancelled = true
    }
  }, [credentialSubject?.chainId, datatokenAddress, ddo])

  return ddo ? (
    <>
      <div className={styles.didContainer}>
        <MetaItem
          title="DID"
          content={<TruncatedMetaValue value={ddo.id} start={12} end={8} />}
        />
      </div>

      <div className={styles.metaFull}>
        {!isInPurgatory && metadata?.author && (
          <span className={styles.dataAuther}>
            <MetaItem title="Data Author" content={metadata.author} />
          </span>
        )}
        {metadata?.copyrightHolder && (
          <MetaItem
            title="Copyright Holder"
            content={metadata.copyrightHolder}
          />
        )}
        {metadata?.providedBy && (
          <MetaItem
            title="Provided By"
            content={
              <a
                href={safeExternalWebUrl(metadata.providedBy)}
                target="_blank"
                rel="noreferrer"
              >
                {metadata.providedBy}
              </a>
            }
          />
        )}
        <MetaItem
          title="Owner"
          content={<Publisher account={ddo?.indexedMetadata?.nft?.owner} />}
        />
        {publisherDid && (
          <MetaItem
            title="Publisher DID"
            content={
              <TruncatedMetaValue value={publisherDid} start={12} end={12} />
            }
          />
        )}
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
        {metadata?.type === 'algorithm' && dockerImage && (
          <MetaItem title="Docker Image" content={dockerImage} />
        )}
      </div>

      <MetaLinks links={ddo?.credentialSubject?.metadata?.links} />

      <div className={styles.licenseRow}>
        <Label htmlFor="license">
          <span className={styles.licenceTitle}>License</span>
        </Label>
        {primaryLicenseMirror?.type === 'url' && primaryLicenseMirror?.url ? (
          <a
            target="_blank"
            href={safeExternalWebUrl(primaryLicenseMirror.url)}
            rel="noreferrer"
          >
            {primaryLicenseDocument.name}
          </a>
        ) : (
          <IpfsRemoteSource
            noDocumentLabel="No license document available"
            remoteSource={primaryLicenseMirror}
            name={primaryLicenseDocument?.name}
          />
        )}
        <AdditionalLicenseFiles licenseDocuments={license?.licenseDocuments} />
        <MetaItem title="OE Node" content={oeNode || 'Not available'} />
      </div>
    </>
  ) : null
}
