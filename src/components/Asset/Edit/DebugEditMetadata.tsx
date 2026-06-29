import { ReactElement, useEffect, useState } from 'react'
import DebugOutput from '@shared/DebugOutput'
import { MetadataEditForm } from './_types'
import { previewDebugPatch } from '@utils/ddo'
import {
  generateCredentials,
  transformConsumerParameters
} from '@components/Publish/_utils'
import { Asset, AssetNft } from 'src/@types/Asset'
import { Metadata } from 'src/@types/ddo/Metadata'
import { Credential } from 'src/@types/ddo/Credentials'
import { AssetExtended } from 'src/@types/AssetExtended'
import { keyValuePairsToRecord } from '@utils/links'
import { State } from 'src/@types/ddo/State'

export default function DebugEditMetadata({
  values,
  asset
}: {
  values: MetadataEditForm
  asset: Asset
}): ReactElement {
  const [valuePreview, setValuePreview] = useState({})
  const [updatedAsset, setUpdatedAsset] = useState<Asset>()

  useEffect(() => {
    function transformValues() {
      const newMetadata: Metadata = {
        ...asset?.credentialSubject?.metadata,
        name: values.name,
        description: {
          '@value': values.description,
          '@direction': values.descriptionDirection || '',
          '@language': values.descriptionLanguage || ''
        },
        links: keyValuePairsToRecord(values.links),
        author: values.author,
        providedBy: values.providedBy || '',
        copyrightHolder: values.copyrightHolder || '',
        tags: values.tags,
        license: values.license,
        additionalInformation: {
          ...asset?.credentialSubject?.metadata?.additionalInformation
        }
      }

      if (asset.credentialSubject?.metadata.type === 'algorithm') {
        newMetadata.algorithm.consumerParameters =
          !values.usesConsumerParameters
            ? undefined
            : transformConsumerParameters(values.consumerParameters)
      }
      const updatedCredentials: Credential = generateCredentials(
        values.credentials
      )
      const updatedNft: AssetNft = {
        ...asset.indexedMetadata.nft,
        state:
          values.assetState !== undefined
            ? State[values.assetState as unknown as keyof typeof State]
            : asset.indexedMetadata.nft.state
      }
      const tmpAsset: Asset = {
        ...asset,
        credentialSubject: {
          ...asset.credentialSubject,
          metadata: newMetadata,
          credentials: updatedCredentials
        },
        indexedMetadata: {
          ...asset?.indexedMetadata,
          nft: updatedNft
        }
      }

      // delete custom helper properties injected in the market that will not be written on chain
      delete (tmpAsset as AssetExtended).accessDetails
      delete (tmpAsset as AssetExtended).views
      delete (tmpAsset as AssetExtended).offchain
      delete (tmpAsset as any).credentialSubject.stats

      setUpdatedAsset(tmpAsset)
    }

    transformValues()
    setValuePreview(previewDebugPatch(values))
  }, [asset, values])

  return (
    <>
      <DebugOutput title="Collected Form Values" output={valuePreview} large />
      <DebugOutput
        title="Transformed Asset Values"
        output={updatedAsset}
        large
      />
    </>
  )
}
