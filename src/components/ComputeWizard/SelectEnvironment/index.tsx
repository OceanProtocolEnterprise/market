import { ReactElement, useState, useEffect } from 'react'
import { useFormikContext } from 'formik'
import { useAccount } from 'wagmi'
import { ComputeEnvironment } from '@oceanprotocol/lib'
import StepTitle from '@shared/StepTitle'
import EnvironmentSelection from '@shared/FormInput/InputElement/EnvironmentSelection'
import { FormComputeData } from '../_types'
import styles from './index.module.css'

interface SelectEnvironmentProps {
  computeEnvs: ComputeEnvironment[]
  setOuterFieldValue?: (field: string, value: any) => void
}

export default function SelectEnvironment({
  computeEnvs,
  setOuterFieldValue
}: SelectEnvironmentProps): ReactElement {
  const { address: accountId } = useAccount()
  const { values, setFieldValue } = useFormikContext<FormComputeData>()
  const [selectedEnvId, setSelectedEnvId] = useState<string>()

  // Initialize selected environment from form values
  useEffect(() => {
    if (values.computeEnv?.id) {
      setSelectedEnvId(values.computeEnv.id)
    }
  }, [values.computeEnv])

  const handleEnvironmentSelect = (envId: string) => {
    setSelectedEnvId(envId)
    const selectedEnv = computeEnvs.find((env) => env.id === envId)
    // Set as id strings in both inner and outer forms for consistency
    setFieldValue('computeEnv', envId)
    setOuterFieldValue && setOuterFieldValue('computeEnv', envId)
  }

  return (
    <>
      <StepTitle title="Select C2D Environment" />

      <div className={styles.environmentSelection}>
        <EnvironmentSelection
          environments={computeEnvs}
          selected={selectedEnvId}
          onChange={handleEnvironmentSelect}
        />
      </div>
    </>
  )
}
