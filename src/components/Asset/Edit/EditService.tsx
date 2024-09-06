import { ReactElement, useState } from 'react'
import { Formik } from 'formik'
import {
  LoggerInstance,
  FixedRateExchange,
  Datatoken,
  Service
} from '@oceanprotocol/lib'
import { getServiceInitialValues } from './_constants'
import { ServiceEditForm } from './_types'
import Web3Feedback from '@shared/Web3Feedback'
import { mapTimeoutStringToSeconds, normalizeFile } from '@utils/ddo'
import content from '../../../../content/pages/editService.json'
import { useAbortController } from '@hooks/useAbortController'
import { getOceanConfig } from '@utils/ocean'
import EditFeedback from './EditFeedback'
import { useAsset } from '@context/Asset'
import { setNftMetadata } from '@utils/nft'
import { getEncryptedFiles } from '@utils/provider'
import { useAccount, useNetwork, useSigner } from 'wagmi'
import { transformConsumerParameters } from '@components/Publish/_utils'
import FormEditService from './FormEditService'

export default function EditService({
  asset,
  service,
  accessDetails
}: {
  asset: AssetExtended
  service: Service
  accessDetails: AccessDetails | undefined
}): ReactElement {
  const { fetchAsset, isAssetNetwork } = useAsset()
  const { address: accountId } = useAccount()
  const { chain } = useNetwork()
  const { data: signer } = useSigner()
  const newAbortController = useAbortController()

  const [success, setSuccess] = useState<string>()
  const [error, setError] = useState<string>()
  const hasFeedback = error || success

  async function updateFixedPrice(newPrice: number) {
    console.log('updateFixedPrice')
    const config = getOceanConfig(asset.chainId)

    const fixedRateInstance = new FixedRateExchange(
      config.fixedRateExchangeAddress,
      signer
    )

    const setPriceResp = await fixedRateInstance.setRate(
      accessDetails.addressOrId,
      newPrice.toString()
    )
    LoggerInstance.log('[edit] setFixedRate result', setPriceResp)
    if (!setPriceResp) {
      setError(content.form.error)
      LoggerInstance.error(content.form.error)
    }
  }

  // edit 1 service
  async function handleSubmit(values: ServiceEditForm, resetForm: () => void) {
    console.log('values', values)
    try {
      // update fixed price if changed
      accessDetails.type === 'fixed' &&
        values.price !== parseFloat(accessDetails.price) &&
        (await updateFixedPrice(values.price))

      // update payment collector if changed
      if (values.paymentCollector !== accessDetails.paymentCollector) {
        console.log('setting payment collector')
        const datatoken = new Datatoken(signer)
        await datatoken.setPaymentCollector(
          service.datatokenAddress,
          accountId,
          values.paymentCollector
        )
      }

      let updatedFiles = service.files
      if (values.files[0]?.url) {
        console.log('updating files')
        const file = {
          nftAddress: asset.nftAddress,
          datatokenAddress: service.datatokenAddress,
          files: [
            normalizeFile(values.files[0].type, values.files[0], chain?.id)
          ]
        }

        const filesEncrypted = await getEncryptedFiles(
          file,
          asset.chainId,
          service.serviceEndpoint
        )
        updatedFiles = filesEncrypted
      }

      const updatedService: Service = {
        ...service,
        name: values.name,
        description: values.description,
        timeout: mapTimeoutStringToSeconds(values.timeout),
        files: updatedFiles, // TODO: check if this works
        ...(values.access === 'compute' && {
          compute: values.compute
        })
      }
      if (values.consumerParameters) {
        updatedService.consumerParameters = transformConsumerParameters(
          values.consumerParameters
        )
      }

      // update asset with new service
      const serviceIndex = asset.services.findIndex((s) => s.id === service.id)
      const updatedAsset = { ...asset }
      updatedAsset.services[serviceIndex] = updatedService

      // delete custom helper properties injected in the market so we don't write them on chain
      delete (updatedAsset as AssetExtended).accessDetails
      delete (updatedAsset as AssetExtended).datatokens
      delete (updatedAsset as AssetExtended).stats
      delete (updatedAsset as AssetExtended).offchain

      const setMetadataTx = await setNftMetadata(
        updatedAsset,
        accountId,
        signer,
        newAbortController()
      )

      if (!setMetadataTx) {
        setError(content.form.error)
        LoggerInstance.error(content.form.error)
        return
      }
      // Edit succeeded
      setSuccess(content.form.success)
      resetForm()
    } catch (error) {
      LoggerInstance.error(error.message)
      setError(error.message)
    }
  }

  if (!accessDetails) return null

  return (
    <Formik
      enableReinitialize
      initialValues={getServiceInitialValues(service, accessDetails)}
      // validationSchema={validationSchema} TODO
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
              to: `/asset/${asset.id}`
            }}
          />
        ) : (
          <>
            <FormEditService
              data={content.form.data}
              service={service}
              accessDetails={accessDetails}
            />

            <Web3Feedback
              networkId={asset?.chainId}
              accountId={accountId}
              isAssetNetwork={isAssetNetwork}
            />
          </>
        )
      }
    </Formik>
  )
}
