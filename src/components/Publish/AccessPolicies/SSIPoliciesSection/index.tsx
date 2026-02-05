import { ReactElement, useState, useEffect } from 'react'
import { useFormikContext } from 'formik'
import { FormPublishData } from '../../_types'
import { PolicyEditor } from '@components/@shared/PolicyEditor'
import SectionContainer from '../../../@shared/SectionContainer/SectionContainer'
import Input from '@shared/FormInput'
import appConfig from 'app.config.cjs'

interface SSIPoliciesSectionProps {
  defaultPolicies: string[]
  defaultSelectedPolicies: string[]
}

export default function SSIPoliciesSection({
  defaultPolicies,
  defaultSelectedPolicies
}: SSIPoliciesSectionProps): ReactElement {
  const { values, setFieldValue } = useFormikContext<FormPublishData>()

  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    setEnabled(values.credentials?.enabled === true)
  }, [values.credentials?.enabled])

  const handleToggleSSI = () => {
    const newEnabled = !enabled
    setEnabled(newEnabled)

    setFieldValue('credentials.enabled', newEnabled)

    if (!newEnabled) {
      setFieldValue('credentials.requestCredentials', [])
      setFieldValue('credentials.vcPolicies', [])
      setFieldValue('credentials.vpPolicies', [])
    } else if (!values.credentials?.vcPolicies?.length) {
      setFieldValue('credentials.vcPolicies', defaultSelectedPolicies)
    }
  }

  if (!appConfig.ssiEnabled) {
    return null
  }

  return (
    <>
      <Input
        name="enableSSI"
        label="Enable SSI Policies"
        type="checkbox"
        options={['Enable SSI Policies']}
        checked={enabled}
        onChange={handleToggleSSI}
        hideLabel={true}
      />
      {enabled && (
        <SectionContainer
          title="SSI Policies"
          help="Self-sovereign identity (SSI) policies define verification requirements for asset consumers. Configure which credentials and verification policies are required to access this asset."
        >
          <PolicyEditor
            credentials={values.credentials}
            setCredentials={(newCredentials) =>
              setFieldValue('credentials', newCredentials)
            }
            name="credentials"
            defaultPolicies={defaultPolicies}
            isAsset={true}
            enabledView={true}
            hideDefaultPolicies={false}
          />
        </SectionContainer>
      )}
    </>
  )
}
