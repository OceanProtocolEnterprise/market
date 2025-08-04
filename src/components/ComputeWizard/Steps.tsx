import { ReactElement, useEffect } from 'react'
import { useFormikContext } from 'formik'
import { FormComputeData } from './_types'
import { useAccount, useNetwork } from 'wagmi'
import { AssetSelectionAsset } from '@shared/FormInput/InputElement/AssetSelection'
import { ComputeEnvironment } from '@oceanprotocol/lib'
import { datasetSteps, algorithmSteps } from './_constants'
import SelectAlgorithm from './SelectAlgorithm'
import SelectServices from './SelectServices'
import PreviewSelectedServices from './PreviewSelectedServices'
import SelectEnvironment from './SelectEnvironment'
import SelectDataset from './SelectDataset'
import ConfigureEnvironment from './ConfigureEnvironment'
import Review from './Review'

export default function Steps({
  datasets,
  algorithms,
  computeEnvs,
  isAlgorithm,
  totalPrices,
  datasetOrderPrice,
  algoOrderPrice,
  c2dPrice,
  isRequestingPrice,
  allResourceValues,
  setAllResourceValues
}: {
  datasets?: AssetSelectionAsset[]
  algorithms: AssetSelectionAsset[]
  computeEnvs: ComputeEnvironment[]
  isAlgorithm: boolean
  totalPrices?: { value: string; symbol: string }[]
  datasetOrderPrice?: string
  algoOrderPrice?: string
  c2dPrice?: string
  isRequestingPrice?: boolean
  allResourceValues?: { [envId: string]: any }
  setAllResourceValues?: React.Dispatch<
    React.SetStateAction<{ [envId: string]: any }>
  >
}): ReactElement {
  const { address: accountId } = useAccount()
  const { chain } = useNetwork()
  const { values, setFieldValue } = useFormikContext<FormComputeData>()

  useEffect(() => {
    if (!chain?.id || !accountId) return
    setFieldValue('user.chainId', chain?.id)
    setFieldValue('user.accountId', accountId)
  }, [chain?.id, accountId, setFieldValue])

  const currentStep = values.user.stepCurrent
  const steps = isAlgorithm ? algorithmSteps : datasetSteps

  // For dataset flow
  if (!isAlgorithm) {
    switch (currentStep) {
      case 1:
        return <SelectAlgorithm algorithms={algorithms} />
      case 2:
        return <SelectEnvironment computeEnvs={computeEnvs} />
      case 3:
        return (
          <ConfigureEnvironment
            allResourceValues={allResourceValues}
            setAllResourceValues={setAllResourceValues}
            computeEnvs={computeEnvs}
          />
        )
      case 4:
        return (
          <Review
            totalPrices={totalPrices}
            datasetOrderPrice={datasetOrderPrice}
            algoOrderPrice={algoOrderPrice}
            c2dPrice={c2dPrice}
            isRequestingPrice={isRequestingPrice}
          />
        )
      default:
        return <div>Invalid step</div>
    }
  }

  // For algorithm flow
  switch (currentStep) {
    case 1:
      return <SelectDataset />
    case 2:
      return <SelectServices />
    case 3:
      return <PreviewSelectedServices />
    case 4:
      return <SelectEnvironment computeEnvs={computeEnvs} />
    case 5:
      return (
        <ConfigureEnvironment
          allResourceValues={allResourceValues}
          setAllResourceValues={setAllResourceValues}
          computeEnvs={computeEnvs}
        />
      )
    case 6:
      return (
        <Review
          totalPrices={totalPrices}
          datasetOrderPrice={datasetOrderPrice}
          algoOrderPrice={algoOrderPrice}
          c2dPrice={c2dPrice}
          isRequestingPrice={isRequestingPrice}
        />
      )
    default:
      return <div>Invalid step</div>
  }
}
