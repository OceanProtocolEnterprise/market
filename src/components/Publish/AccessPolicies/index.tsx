import { useFormikContext } from 'formik'
import { ReactElement, useEffect, useState } from 'react'
import { FormPublishData } from '../_types'
import AccessRulesSection from './AccessRulesSection'
import SSIPoliciesSection from './SSIPoliciesSection'
import { getDefaultPolicies } from '../_utils'
import appConfig from 'app.config.cjs'

const FALLBACK_POLICIES = [
  'signature',
  'not-before',
  'revoked-status-list',
  'expired',
  'signature_sd-jwt-vc'
]

const uniquePolicies = (items: string[]): string[] => Array.from(new Set(items))

export function AccessPolicies(): ReactElement {
  const { values, setFieldValue } = useFormikContext<FormPublishData>()
  const [defaultPolicies, setDefaultPolicies] =
    useState<string[]>(FALLBACK_POLICIES)
  const [defaultSelectedPolicies, setDefaultSelectedPolicies] =
    useState<string[]>(FALLBACK_POLICIES)

  useEffect(() => {
    if (!appConfig.ssiEnabled) return
    if (values.accessPolicyPageVisited) return

    getDefaultPolicies()
      .then((policies) => {
        const apiPolicies =
          Array.isArray(policies) && policies.length > 0
            ? policies
            : FALLBACK_POLICIES
        const mergedPolicies = uniquePolicies([
          ...FALLBACK_POLICIES,
          ...apiPolicies
        ])
        setDefaultPolicies(mergedPolicies)
        setDefaultSelectedPolicies(apiPolicies)
        if (!values.credentials?.vcPolicies?.length) {
          setFieldValue('credentials.vcPolicies', apiPolicies)
        }
      })
      .catch(() => {
        setDefaultPolicies(FALLBACK_POLICIES)
        setDefaultSelectedPolicies(FALLBACK_POLICIES)
        if (!values.credentials?.vcPolicies?.length) {
          setFieldValue('credentials.vcPolicies', FALLBACK_POLICIES)
        }
      })
  }, [
    setFieldValue,
    values.accessPolicyPageVisited,
    values.credentials?.vcPolicies?.length
  ])

  useEffect(() => {
    if (!values.accessPolicyPageVisited) {
      setFieldValue('accessPolicyPageVisited', true)
    }
  }, [values.accessPolicyPageVisited, setFieldValue])
  return (
    <>
      <AccessRulesSection />
      <SSIPoliciesSection
        defaultPolicies={defaultPolicies}
        defaultSelectedPolicies={defaultSelectedPolicies}
      />
    </>
  )
}
