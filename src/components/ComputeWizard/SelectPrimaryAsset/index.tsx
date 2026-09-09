'use client'

import { ReactElement, useEffect, useMemo, useState } from 'react'
import { useFormikContext } from 'formik'
import StepTitle from '@shared/StepTitle'
import { AssetSelectionAsset } from '@shared/FormInput/InputElement/AssetSelection'
import DatasetSelection from '@shared/FormInput/InputElement/DatasetSelection'
import { Service } from 'src/@types/ddo/Service'
import { AssetExtended } from 'src/@types/AssetExtended'
import { ComputeFlow, FormComputeData } from '../_types'
import styles from './index.module.css'
import LoaderOverlay from '../LoaderOverlay'

type DatasetService = {
  serviceId: string
  serviceName?: string
  serviceDescription?: string
  serviceDuration?: string | number
  serviceType?: string
  price?: number
  tokenSymbol?: string
  checked?: boolean
  isAccountIdWhitelisted?: boolean
  datetime?: string
  userParameters?: unknown[]
  selectionDisabled?: boolean
  selectionDisabledReason?: string
}

type DatasetItem = {
  did: string
  name: string
  symbol?: string
  tokenSymbol?: string
  description?: string
  datasetPrice: number
  expanded?: boolean
  checked?: boolean
  services: DatasetService[]
  selectionDisabled?: boolean
  selectionDisabledReason?: string
}

interface SelectPrimaryAssetProps {
  flow: ComputeFlow
  algorithms?: AssetSelectionAsset[]
  datasets?: AssetSelectionAsset[]
  asset: AssetExtended
  service: Service
  accessDetails: AccessDetails
}

type RawDatasetEntry = {
  did?: string
  id?: string
  name: string
  symbol?: string
  description?: string
  serviceId: string
  serviceName?: string
  serviceDescription?: string
  serviceDuration?: string
  serviceType?: string
  price?: number | string
  tokenSymbol?: string
  checked?: boolean
  isAccountIdWhitelisted?: boolean
  datetime?: string
  userParameters?: DatasetService['userParameters']
  selectionDisabled?: boolean
  selectionDisabledReason?: string
}

function parseAlgorithmSelection(value: string | unknown): {
  algorithmId: string | null
  serviceId: string | null
} {
  if (typeof value !== 'string') {
    return { algorithmId: null, serviceId: null }
  }

  try {
    const parsed = JSON.parse(value) as { algoDid?: string; serviceId?: string }
    return {
      algorithmId: parsed?.algoDid ?? null,
      serviceId: parsed?.serviceId ?? null
    }
  } catch {
    return { algorithmId: value, serviceId: null }
  }
}

function transformDatasets(
  datasets: RawDatasetEntry[],
  selectedIds: string[] = []
): DatasetItem[] {
  const grouped: Record<string, DatasetItem> = {}
  const tokenSymbolSets: Record<string, Set<string>> = {}

  for (const ds of datasets) {
    const identifier = ds.did || ds.id

    if (!grouped[identifier]) {
      grouped[identifier] = {
        did: identifier,
        name: ds.name,
        symbol: ds.symbol,
        tokenSymbol: '',
        description: ds.description,
        datasetPrice: 0,
        expanded: selectedIds.includes(identifier),
        checked: selectedIds.includes(identifier),
        services: []
      }
    }

    if (!tokenSymbolSets[identifier]) {
      tokenSymbolSets[identifier] = new Set<string>()
    }

    const priceValue =
      typeof ds.price === 'string' ? Number(ds.price) : ds.price ?? 0

    const service: DatasetService = {
      serviceId: ds.serviceId,
      serviceName: ds.serviceName,
      serviceDescription: ds.serviceDescription,
      serviceDuration: (ds.serviceDuration ??
        0) as DatasetService['serviceDuration'],
      serviceType: ds.serviceType,
      price: priceValue,
      tokenSymbol: ds.tokenSymbol || ds.symbol,
      checked: ds.checked,
      isAccountIdWhitelisted: ds.isAccountIdWhitelisted,
      datetime: ds.datetime,
      userParameters: ds.userParameters ?? [],
      selectionDisabled: ds.selectionDisabled,
      selectionDisabledReason: ds.selectionDisabledReason
    }

    if (service.tokenSymbol) {
      tokenSymbolSets[identifier].add(service.tokenSymbol)
    }

    grouped[identifier].services.push(service)
    grouped[identifier].datasetPrice += priceValue
  }

  return Object.values(grouped).map((dataset) => {
    const tokens = tokenSymbolSets[dataset.did]
      ? Array.from(tokenSymbolSets[dataset.did])
      : []
    return {
      ...dataset,
      tokenSymbol: tokens.length > 0 ? tokens.join(' & ') : dataset.tokenSymbol,
      selectionDisabled:
        dataset.services.length > 0 &&
        dataset.services.every((service) => service.selectionDisabled),
      selectionDisabledReason: dataset.services.every(
        (service) => service.selectionDisabled
      )
        ? dataset.services.find((service) => service.selectionDisabledReason)
            ?.selectionDisabledReason
        : undefined
    }
  })
}

export default function SelectPrimaryAsset({
  flow,
  algorithms = [],
  datasets,
  asset
}: SelectPrimaryAssetProps): ReactElement {
  const isDatasetFlow = flow === 'dataset'
  const { values, setFieldValue } = useFormikContext<FormComputeData>()
  const [datasetsForCompute, setDatasetsForCompute] = useState<DatasetItem[]>()
  const isLoadingDatasets = !isDatasetFlow && datasets === undefined

  const selectedDatasetIds = useMemo(() => {
    const ids =
      values.datasets?.map((dataset) => dataset.did ?? dataset.id) ?? []
    return ids.filter((identifier): identifier is string => Boolean(identifier))
  }, [values.datasets])
  const datasetFlowSelectedIds = useMemo(() => {
    const selected = values.algorithm
    if (!selected) return []
    const selectionValue = Array.isArray(selected) ? selected[0] : selected
    const { algorithmId } = parseAlgorithmSelection(selectionValue)
    if (!algorithmId) return [selectionValue]

    const matchingOption = algorithms.find((algo) => algo.did === algorithmId)
    if (!matchingOption) return [selectionValue]

    const encodedId = JSON.stringify({
      algoDid: matchingOption.did,
      serviceId: matchingOption.serviceId
    })
    return [encodedId]
  }, [values.algorithm, algorithms])

  useEffect(() => {
    if (isDatasetFlow) return
    if (!datasets) return

    const selectedIdsSnapshot =
      values.datasets
        ?.map((dataset) => dataset.did ?? dataset.id)
        .filter((identifier): identifier is string => Boolean(identifier)) ?? []

    const datasetsRaw = (datasets as unknown as RawDatasetEntry[]) ?? []
    setDatasetsForCompute(transformDatasets(datasetsRaw, selectedIdsSnapshot))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDatasetFlow, datasets])

  const handleDatasetSelect = (did: string) => {
    if (isDatasetFlow) return

    const isCurrentlySelected = selectedDatasetIds.includes(did)
    const updatedDatasetIds = isCurrentlySelected
      ? selectedDatasetIds.filter((id) => id !== did)
      : [...selectedDatasetIds, did]

    const updatedDatasets =
      datasetsForCompute?.map((ds) => {
        const isSelected = updatedDatasetIds.includes(ds.did)
        const servicesWithSelection =
          ds.services?.map((svc) => ({
            ...svc,
            checked: isSelected ? svc.checked : false
          })) || []

        if (
          isSelected &&
          servicesWithSelection.length === 1 &&
          !servicesWithSelection[0].checked &&
          !servicesWithSelection[0].selectionDisabled
        ) {
          servicesWithSelection[0].checked = true
        }

        return {
          ...ds,
          checked: isSelected,
          expanded: isSelected,
          services: servicesWithSelection
        }
      }) || []

    setDatasetsForCompute(updatedDatasets)

    const selectedDatasets = updatedDatasets.filter((ds) =>
      updatedDatasetIds.includes(ds.did)
    )

    setFieldValue('datasets', selectedDatasets)
    const datasetPairs = selectedDatasets.map((ds) => {
      const primaryService =
        ds.services?.find((svc) => svc.checked) || ds.services?.[0]
      const primaryServiceId = primaryService?.serviceId
      return primaryServiceId ? `${ds.did}|${primaryServiceId}` : ds.did
    })
    setFieldValue('dataset', datasetPairs)
  }

  const noDatasetClasses = [
    styles.noDatasetOption,
    values.withoutDataset ? styles.noDatasetOptionActive : ''
  ]
    .filter(Boolean)
    .join(' ')

  const selectionWrapperClasses = [
    styles.datasetSelectionWrapper,
    values.withoutDataset ? styles.datasetSelectionDisabled : ''
  ]
    .filter(Boolean)
    .join(' ')

  const algorithmOptions = useMemo(() => {
    if (!isDatasetFlow) return []
    return (algorithms || []).map((algo) => {
      const encodedId = JSON.stringify({
        algoDid: algo.did,
        serviceId: algo.serviceId
      })
      return {
        did: algo.did,
        value: encodedId,
        name: algo.name,
        description: algo.serviceDescription || algo.description,
        serviceDescription: algo.serviceDescription,
        serviceId: algo.serviceId,
        serviceName: algo.serviceName,
        tokenSymbol: '',
        symbol: algo.symbol || '',
        price: Number(algo.price ?? 0),
        serviceType: algo.serviceType,
        serviceDuration:
          typeof algo.serviceDuration === 'number'
            ? algo.serviceDuration
            : Number(algo.serviceDuration ?? 0),
        checked: datasetFlowSelectedIds.includes(encodedId),
        isAccountIdWhitelisted: algo.isAccountIdWhitelisted,
        selectionDisabled: algo.selectionDisabled,
        selectionDisabledReason: algo.selectionDisabledReason
      }
    })
  }, [algorithms, datasetFlowSelectedIds, isDatasetFlow])

  const datasetsForSelection = useMemo(() => {
    if (isDatasetFlow) return algorithmOptions
    const mapped =
      datasetsForCompute?.map((ds) => {
        const svc = ds.services?.[0]
        return {
          did: ds.did,
          value: ds.did,
          name: ds.name,
          description: ds.description,
          serviceDescription: svc?.serviceDescription,
          serviceId: svc?.serviceId || '',
          serviceName: svc?.serviceName || '',
          tokenSymbol: '',
          symbol: ds.symbol || '',
          price: Number(svc?.price ?? 0),
          serviceType: svc?.serviceType,
          serviceDuration:
            typeof svc?.serviceDuration === 'number'
              ? svc.serviceDuration
              : Number(svc?.serviceDuration ?? 0),
          checked: Boolean(ds.checked),
          isAccountIdWhitelisted: svc?.isAccountIdWhitelisted || false,
          selectionDisabled: ds.selectionDisabled,
          selectionDisabledReason: ds.selectionDisabledReason
        }
      }) || []
    return mapped
  }, [algorithmOptions, datasetsForCompute, isDatasetFlow])

  const selectedIds = isDatasetFlow
    ? datasetFlowSelectedIds
    : selectedDatasetIds

  useEffect(() => {
    const disabledIds = new Set(
      datasetsForSelection
        .filter((item) => item.selectionDisabled)
        .map((item) => item.did)
    )
    if (disabledIds.size === 0) return

    if (isDatasetFlow) {
      const selectedAlgorithmId = algorithms.find((algorithm) =>
        datasetFlowSelectedIds.includes(
          JSON.stringify({
            algoDid: algorithm.did,
            serviceId: algorithm.serviceId
          })
        )
      )?.did
      if (!selectedAlgorithmId || !disabledIds.has(selectedAlgorithmId)) return

      setFieldValue('algorithm', undefined)
      setFieldValue('algorithms', undefined)
      setFieldValue('serviceSelected', false)
      return
    }

    if (!selectedDatasetIds.some((did) => disabledIds.has(did))) return

    setFieldValue(
      'datasets',
      values.datasets?.filter(
        (dataset) => !disabledIds.has(dataset.did ?? dataset.id)
      ) ?? []
    )
    setFieldValue(
      'dataset',
      (Array.isArray(values.dataset) ? values.dataset : []).filter(
        (selection) =>
          typeof selection !== 'string' ||
          !disabledIds.has(selection.split('|')[0])
      )
    )
  }, [
    algorithms,
    datasetFlowSelectedIds,
    datasetsForSelection,
    isDatasetFlow,
    selectedDatasetIds,
    setFieldValue,
    values.dataset,
    values.datasets
  ])

  const handleSelectionChange = (did: string) => {
    if (isDatasetFlow) {
      setFieldValue('algorithm', did)
      return
    }
    handleDatasetSelect(did)
  }

  return (
    <>
      <StepTitle
        title={isDatasetFlow ? 'Select Algorithm' : 'Select Datasets'}
      />
      <div className={styles.environmentSelection}>
        {!isDatasetFlow && (
          <div className={noDatasetClasses}>
            <label className={styles.noDatasetLabel}>
              <span>Proceed without Dataset Selection</span>
              <input
                type="checkbox"
                className={styles.noDatasetCheckbox}
                checked={values.withoutDataset || false}
                onChange={(e) => {
                  const { checked } = e.target
                  setFieldValue('withoutDataset', checked)
                  if (checked) {
                    setFieldValue('datasets', [])
                    setFieldValue('dataset', [])
                  }
                }}
              />
            </label>
          </div>
        )}

        <div className={selectionWrapperClasses}>
          <DatasetSelection
            asset={asset}
            datasets={datasetsForSelection}
            selected={selectedIds}
            disabled={values.withoutDataset}
            onChange={handleSelectionChange}
          />
          {!isDatasetFlow && (
            <LoaderOverlay
              visible={isLoadingDatasets}
              message="Loading datasets..."
            />
          )}
        </div>
      </div>
    </>
  )
}
