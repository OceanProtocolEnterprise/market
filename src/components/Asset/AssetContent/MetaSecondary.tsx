import { ReactElement } from 'react'
import MetaItem from './MetaItem'
import styles from './MetaSecondary.module.css'
import Tags from '@shared/atoms/AssetTags'
import { Asset } from 'src/@types/Asset'
import SampleFilesDropdown from './SampleFilesDropdown'

export default function MetaSecondary({ ddo }: { ddo: Asset }): ReactElement {
  // Sample data files live on the individual services (`service.links`)
  const hasServiceLinks = ddo?.credentialSubject?.services?.some(
    (service) => service.links && Object.keys(service.links).length > 0
  )

  return (
    <aside className={styles.metaSecondary}>
      {hasServiceLinks && (
        <div className={styles.samples}>
          <MetaItem
            title="Sample Data"
            content={
              <SampleFilesDropdown
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
