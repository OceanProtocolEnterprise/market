import { ReactElement, useEffect, useState } from 'react'
import styles from './AlgorithmDatasetsListForCompute.module.css'
import { getAlgorithmDatasetsForCompute } from '@utils/aquarius'
import { AssetSelectionAsset } from '@shared/FormInput/InputElement/AssetSelection'
import AssetComputeList from './AssetComputeList'
import { useCancelToken } from '@hooks/useCancelToken'
import { useAccount } from 'wagmi'
import { Service } from 'src/@types/ddo/Service'
import { AssetExtended } from 'src/@types/AssetExtended'

export default function AlgorithmDatasetsListForCompute({
  asset,
  service,
  accessDetails
}: {
  asset: AssetExtended
  service: Service
  accessDetails: AccessDetails
}): ReactElement {
  const { address: accountId } = useAccount()
  const newCancelToken = useCancelToken()
  const [datasetsForCompute, setDatasetsForCompute] =
    useState<AssetSelectionAsset[]>()

  useEffect(() => {
    if (!accessDetails.type) return

    async function getDatasetsAllowedForCompute() {
      const datasets = await getAlgorithmDatasetsForCompute(
        asset.credentialSubject?.id,
        service.serviceEndpoint,
        accountId,
        asset.credentialSubject?.chainId,
        newCancelToken()
      )
      setDatasetsForCompute(datasets)
    }
    asset.credentialSubject?.metadata.type === 'algorithm' &&
      getDatasetsAllowedForCompute()
  }, [accessDetails, accountId, asset, newCancelToken, service])

  return (
    <div className={styles.datasetsContainer}>
      <h3 className={styles.text}>Datasets algorithm is allowed to run on</h3>
      <AssetComputeList assets={datasetsForCompute} />
    </div>
  )
}
