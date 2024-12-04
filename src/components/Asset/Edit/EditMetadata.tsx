import { ReactElement, useState } from 'react'
import { Formik } from 'formik'
import { LoggerInstance, Nft } from '@oceanprotocol/lib'
import { metadataValidationSchema } from './_validation'
import { getInitialValues } from './_constants'
import { MetadataEditForm } from './_types'
import { useUserPreferences } from '@context/UserPreferences'
import Web3Feedback from '@shared/Web3Feedback'
import FormEditMetadata from './FormEditMetadata'
import styles from './index.module.css'
import content from '../../../../content/pages/editMetadata.json'
import DebugEditMetadata from './DebugEditMetadata'
import EditFeedback from './EditFeedback'
import { useAsset } from '@context/Asset'
import { sanitizeUrl } from '@utils/url'
import { useAccount, useSigner } from 'wagmi'
import {
  transformConsumerParameters,
  generateCredentials,
  signAssetAndUploadToIpfs,
  IpfsUpload
} from '@components/Publish/_utils'
import { Metadata } from 'src/@types/ddo/Metadata'
import { Asset } from 'src/@types/Asset'
import { AssetExtended } from 'src/@types/AssetExtended'
import appConfig, { customProviderUrl } from '../../../../app.config'
import { ethers } from 'ethers'
import { Credential } from 'src/@types/ddo/Credentials'

export default function Edit({
  asset
}: {
  asset: AssetExtended
}): ReactElement {
  const { debug } = useUserPreferences()
  const { fetchAsset, isAssetNetwork, assetState } = useAsset()
  const { address: accountId } = useAccount()
  const { data: signer } = useSigner()

  const [success, setSuccess] = useState<string>()
  const [error, setError] = useState<string>()
  const hasFeedback = error || success

  async function handleSubmit(values: MetadataEditForm, resetForm: () => void) {
    try {
      const linksTransformed = values.links?.length &&
        values.links[0].valid && [sanitizeUrl(values.links[0].url)]
      const updatedMetadata: Metadata = {
        ...asset.credentialSubject?.metadata,
        name: values.name,
        description: {
          '@value': values.description,
          '@direction': '',
          '@language': ''
        },
        links: linksTransformed,
        author: values.author,
        tags: values.tags,
        license: {
          name: values.license
        },
        additionalInformation: {
          ...asset.credentialSubject?.metadata?.additionalInformation
        }
      }

      if (asset.credentialSubject?.metadata.type === 'algorithm') {
        updatedMetadata.algorithm.consumerParameters =
          !values.usesConsumerParameters
            ? undefined
            : transformConsumerParameters(values.consumerParameters)
      }

      const updatedCredentials: Credential[] = generateCredentials(
        asset?.credentialSubject?.credentials,
        values?.allow,
        values?.deny
      )

      const updatedAsset: Asset = {
        ...(asset as Asset),
        credentialSubject: {
          ...(asset as Asset).credentialSubject,
          metadata: updatedMetadata,
          credentials: updatedCredentials
        }
      }

      // delete custom helper properties injected in the market so we don't write them on chain
      delete (updatedAsset as AssetExtended).accessDetails
      delete (updatedAsset as AssetExtended).views
      delete (updatedAsset as AssetExtended).offchain
      delete (updatedAsset as AssetExtended).stats

      const ipfsUpload: IpfsUpload = await signAssetAndUploadToIpfs(
        updatedAsset,
        signer,
        true,
        customProviderUrl ||
          updatedAsset.credentialSubject.services[0]?.serviceEndpoint,
        appConfig.ipfsApiKey,
        appConfig.ipfsSecretApiKey
      )

      if (ipfsUpload /* && values.assetState !== assetState */) {
        const nft = new Nft(signer, updatedAsset.credentialSubject.chainId)

        await nft.setMetadata(
          updatedAsset.credentialSubject.nftAddress,
          await signer.getAddress(),
          0,
          customProviderUrl ||
            updatedAsset.credentialSubject.services[0]?.serviceEndpoint,
          '',
          ethers.utils.hexlify(ipfsUpload.flags),
          ipfsUpload.metadataIPFS,
          ipfsUpload.metadataIPFSHash
        )

        console.log(
          'Version 5.0.0 Asset updated. ID:',
          updatedAsset.credentialSubject.id
        )
      }

      // Edit succeeded
      setSuccess(content.form.success)
      resetForm()
    } catch (error) {
      LoggerInstance.error(error.message)
      setError(error.message)
    }
  }

  return (
    <Formik
      enableReinitialize
      initialValues={getInitialValues(
        asset?.credentialSubject?.metadata,
        asset?.credentialSubject?.credentials,
        assetState
      )}
      validationSchema={metadataValidationSchema}
      onSubmit={async (values, { resetForm }) => {
        // move user's focus to top of screen
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
        // kick off editing
        await handleSubmit(values, resetForm)
      }}
    >
      {({ isSubmitting, values }) =>
        isSubmitting || hasFeedback ? (
          <EditFeedback
            loading="Updating asset with new metadata..."
            error={error}
            success={success}
            setError={setError}
            successAction={{
              name: 'Back to Asset',
              onClick: async () => {
                await fetchAsset()
              },
              to: `/asset/${asset.credentialSubject?.id}`
            }}
          />
        ) : (
          <>
            <FormEditMetadata />

            <Web3Feedback
              networkId={asset?.credentialSubject?.chainId}
              accountId={accountId}
              isAssetNetwork={isAssetNetwork}
            />

            {debug === true && (
              <div className={styles.grid}>
                <DebugEditMetadata values={values} asset={asset} />
              </div>
            )}
          </>
        )
      }
    </Formik>
  )
}
