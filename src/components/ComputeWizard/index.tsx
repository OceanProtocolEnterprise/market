import { ReactElement, useState, useEffect, useRef } from 'react'
import { Form, Formik } from 'formik'
import { useAsset } from '@context/Asset'
import { useAccount } from 'wagmi'
import { useCancelToken } from '@hooks/useCancelToken'
import { AssetSelectionAsset } from '@shared/FormInput/InputElement/AssetSelection'
import {
  getAlgorithmsForAsset,
  getAlgorithmAssetSelectionListForComputeWizard
} from '@utils/compute'
import { getComputeEnvironments } from '@utils/provider'
import { ComputeEnvironment } from '@oceanprotocol/lib'
import PageHeader from '@shared/Page/PageHeader'
import Title from './Title'
import styles from './index.module.css'
import Actions from './Actions'
import Navigation from './Navigation'
import Steps from './Steps'
import { useUserPreferences } from '@context/UserPreferences'
import { validationSchema } from './_validation'
import { initialValues, algorithmSteps, datasetSteps } from './_constants'
import SectionContainer from '../@shared/SectionContainer/SectionContainer'
import Loader from '@shared/atoms/Loader'

export default function ComputeWizard(): ReactElement {
  const { debug } = useUserPreferences()
  const { asset, loading: assetLoading } = useAsset()
  const { address: accountId } = useAccount()
  const newCancelToken = useCancelToken()

  const [algorithms, setAlgorithms] = useState<AssetSelectionAsset[]>([])
  const [computeEnvs, setComputeEnvs] = useState<ComputeEnvironment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()
  const isAlgorithm = asset?.credentialSubject.metadata.type === 'algorithm'
  const steps = isAlgorithm ? algorithmSteps : datasetSteps

  const hasFetchedRef = useRef(false)

  useEffect(() => {
    if (!asset || !accountId || hasFetchedRef.current) return

    async function fetchData() {
      try {
        setIsLoading(true)
        setError(undefined)
        hasFetchedRef.current = true

        const computeService = asset.credentialSubject?.services?.find(
          (service) => service.type === 'compute'
        ) as any

        if (!computeService) {
          setError('No compute service found for this asset')
          setIsLoading(false)
          return
        }

        const algorithmsAssets = await getAlgorithmsForAsset(
          asset,
          computeService,
          newCancelToken()
        )

        const algorithmSelectionList =
          await getAlgorithmAssetSelectionListForComputeWizard(
            computeService,
            algorithmsAssets,
            accountId
          )

        const environments = await getComputeEnvironments(
          computeService.serviceEndpoint,
          asset.credentialSubject?.chainId
        )

        setAlgorithms(algorithmSelectionList)
        setComputeEnvs(environments)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load compute data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [asset, accountId, newCancelToken])

  if (!asset || assetLoading || isLoading) {
    return (
      <div className={styles.container}>
        <Loader message="Loading compute wizard..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <h2>Error</h2>
        <p className={styles.error}>{error}</p>
      </div>
    )
  }

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      enableReinitialize={true}
      onSubmit={async (values) => {
        console.log('Form submitted:', values)
      }}
    >
      {(formikContext) => (
        <div className={styles.containerOuter}>
          <PageHeader title={<Title asset={asset} />} />
          <Form className={styles.form}>
            <Navigation steps={steps} />
            <SectionContainer classNames={styles.container}>
              <Steps
                algorithms={algorithms}
                computeEnvs={computeEnvs}
                isAlgorithm={isAlgorithm}
              />
              <Actions />
            </SectionContainer>
          </Form>
          {debug && (
            <div>Debug: {JSON.stringify(formikContext.values, null, 2)}</div>
          )}
        </div>
      )}
    </Formik>
  )
}
