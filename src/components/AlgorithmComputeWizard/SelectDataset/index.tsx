import { ReactElement, useState, useEffect, useMemo } from 'react'
import { useFormikContext } from 'formik'
import { useAccount } from 'wagmi'
import StepTitle from '@shared/StepTitle'
import { useCancelToken } from '@hooks/useCancelToken'
import DatasetSelection from '@shared/FormInput/InputElement/DatasetSelection'
import { AssetSelectionAsset } from '@shared/FormInput/InputElement/AssetSelection'
import { getAlgorithmDatasetsForComputeSelection } from '@utils/aquarius'
import { FormComputeData } from '../_types'
import { Service } from 'src/@types/ddo/Service'
import { AssetExtended } from 'src/@types/AssetExtended'
import styles from './index.module.css'

type FormValues = {
  dataset: string[]
  datasets: any[]
}

export interface DatasetSelectionDataset extends AssetSelectionAsset {
  checked: boolean
}

export default function SelectDataset({
  asset,
  service,
  accessDetails
}: {
  asset: AssetExtended
  service: Service
  accessDetails: AccessDetails
}): ReactElement {
  const { address: accountId } = useAccount()
  const { values, setFieldValue } = useFormikContext<FormValues>()
  const newCancelToken = useCancelToken()
  const [datasetsForCompute, setDatasetsForCompute] = useState<any[]>()

  const selectedDatasetIds = useMemo(() => {
    return (
      values.datasets?.map((dataset: any) => dataset.did || dataset.id) || []
    )
  }, [values.datasets])

  function transformDatasets(
    datasets: AssetSelectionAsset[],
    selectedIds: string[] = []
  ): any[] {
    const grouped: Record<string, any> = {}

    for (const ds of datasets) {
      if (!grouped[ds.did]) {
        grouped[ds.did] = {
          did: ds.did,
          name: ds.name,
          symbol: ds.symbol,
          datasetPrice: 0,
          description: ds.description,
          expanded: selectedIds.includes(ds.did),
          checked: selectedIds.includes(ds.did),
          services: []
        }
      }

      grouped[ds.did].services.push({
        serviceId: ds.serviceId,
        serviceName: ds.serviceName,
        serviceDescription: ds.serviceDescription,
        serviceDuration: ds.serviceDuration,
        serviceType: ds.serviceType,
        price: ds.price,
        tokenSymbol: ds.tokenSymbol,
        checked: ds.checked,
        isAccountIdWhitelisted: ds.isAccountIdWhitelisted,
        datetime: ds.datetime
      })

      grouped[ds.did].datasetPrice += ds.price
    }

    return Object.values(grouped)
  }

  useEffect(() => {
    if (!accessDetails.type) return

    async function getDatasetsAllowedForCompute() {
      const datasets = await getAlgorithmDatasetsForComputeSelection(
        asset.id,
        service.id,
        service.serviceEndpoint,
        accountId,
        asset.credentialSubject?.chainId,
        newCancelToken()
      )

      const groupedDatasets = transformDatasets(datasets)
      setDatasetsForCompute(groupedDatasets)
    }

    if (asset.credentialSubject?.metadata.type === 'algorithm') {
      getDatasetsAllowedForCompute()
    }
  }, [accessDetails, accountId, asset, newCancelToken, service])

  useEffect(() => {
    if (datasetsForCompute && selectedDatasetIds.length >= 0) {
      const updatedDatasets = datasetsForCompute.map((ds) => ({
        ...ds,
        checked: selectedDatasetIds.includes(ds.did),
        expanded: selectedDatasetIds.includes(ds.did)
      }))
      setDatasetsForCompute(updatedDatasets)
    }
  }, [selectedDatasetIds, datasetsForCompute])

  const handleDatasetSelect = (did: string) => {
    const isCurrentlySelected = selectedDatasetIds.includes(did)
    const updatedDatasetIds = isCurrentlySelected
      ? selectedDatasetIds.filter((id) => id !== did)
      : [...selectedDatasetIds, did]

    // Update form state directly - this will trigger the useMemo above
    const updatedDatasets = datasetsForCompute?.map((ds) => ({
      ...ds,
      checked: updatedDatasetIds.includes(ds.did),
      expanded: updatedDatasetIds.includes(ds.did)
    }))

    const selectedDatasets = updatedDatasets?.filter((ds) =>
      updatedDatasetIds.includes(ds.did)
    )

    setFieldValue('datasets', selectedDatasets)
  }

  return (
    <>
      <StepTitle title="Select Datasets" />
      <div className={styles.environmentSelection}>
        <DatasetSelection
          asset={asset}
          datasets={datasetsForCompute}
          selected={selectedDatasetIds}
          onChange={handleDatasetSelect}
        />
      </div>
    </>
  )
}
