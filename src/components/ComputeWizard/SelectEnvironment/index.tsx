import { ReactElement, useState, useEffect, useCallback } from 'react'
import { useFormikContext } from 'formik'
import { ComputeEnvironment, ProviderInstance } from '@oceanprotocol/lib'
import StepTitle from '@shared/StepTitle'
import EnvironmentSelection from '@shared/FormInput/InputElement/EnvironmentSelection'
import { FormComputeData } from '../_types'
import styles from './index.module.css'
import appConfig from 'app.config.cjs'

interface SelectEnvironmentProps {
  computeEnvs: ComputeEnvironment[]
  providerUrl?: string
}

const { customProviderUrl } = appConfig

export default function SelectEnvironment({
  computeEnvs,
  providerUrl
}: SelectEnvironmentProps): ReactElement {
  const { values, setFieldValue } = useFormikContext<FormComputeData>()
  const [selectedEnvId, setSelectedEnvId] = useState<string>()
  const providerUrlForNodeInfo = providerUrl || customProviderUrl

  useEffect(() => {
    if (values.computeEnv?.id) {
      setSelectedEnvId(values.computeEnv.id)
    }
  }, [values.computeEnv])

  const handleEnvironmentSelect = useCallback(
    async (envId: string) => {
      setSelectedEnvId(envId)
      const availableEnvs =
        computeEnvs?.length > 0
          ? computeEnvs
          : await ProviderInstance.getComputeEnvironments(
              providerUrlForNodeInfo
            )
      const selectedEnv = availableEnvs.find((env) => env.id === envId)
      if (selectedEnv) {
        setFieldValue('computeEnv', selectedEnv)
      }
    },
    [computeEnvs, providerUrlForNodeInfo, setFieldValue]
  )

  return (
    <>
      <StepTitle title="Select C2D Environment" />

      <div className={styles.environmentSelection}>
        <EnvironmentSelection
          environments={computeEnvs}
          selected={selectedEnvId}
          nodeUrl={providerUrlForNodeInfo}
          onChange={handleEnvironmentSelect}
        />
      </div>
    </>
  )
}
