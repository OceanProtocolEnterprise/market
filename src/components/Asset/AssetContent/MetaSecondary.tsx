import { ReactElement } from 'react'
import MetaItem from './MetaItem'
import styles from './MetaSecondary.module.css'
import Tags from '@shared/atoms/AssetTags'
import { Asset } from 'src/@types/Asset'
import SampleFilesDropdown from './SampleFilesDropdown'

export default function MetaSecondary({ ddo }: { ddo: Asset }): ReactElement {
  const hasAssetLinks =
    ddo?.credentialSubject?.metadata?.links &&
    Object.values(ddo?.credentialSubject?.metadata?.links).length > 0

  const hasServiceLinks = ddo?.credentialSubject?.services?.some(
    (service) => service.links && Object.keys(service.links).length > 0
  )

  const hasAnySampleFiles = hasAssetLinks || hasServiceLinks

  return (
    <aside className={styles.metaSecondary}>
      {hasAnySampleFiles && (
        <div className={styles.samples}>
          <MetaItem
            title="Sample Data"
            content={
              <SampleFilesDropdown
                assetLinks={ddo?.credentialSubject?.metadata?.links}
                services={ddo?.credentialSubject?.services}
              />
            }
          />
        </div>
      )}
      {ddo?.credentialSubject?.metadata?.tags?.length > 0 && (
        <Tags items={ddo?.credentialSubject?.metadata?.tags} />
      )}
    </aside>
  )
}
