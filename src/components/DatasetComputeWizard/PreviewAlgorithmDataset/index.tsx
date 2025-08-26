import styles from './index.module.css'
import { useEffect, useState } from 'react'
import { useFormikContext } from 'formik'
import StepTitle from '@shared/StepTitle'
import { AssetExtended } from 'src/@types/AssetExtended'
import { Service } from 'src/@types/ddo/Service'

interface AlgorithmService {
  id: string
  name: string
  title: string
  serviceDescription: string
  type: string
  duration: string | number
  price: string
  symbol: string
  checked?: boolean
}

interface Algorithm {
  id: string
  name: string
  description: string
  services: AlgorithmService[]
  expanded?: boolean
  checked?: boolean
}

interface FormValues {
  algorithm?: string
  algorithmServices?: AlgorithmService[]
}

const PreviewAlgorithmDataset = ({
  selectedAlgorithmAsset
}: {
  selectedAlgorithmAsset?: AssetExtended
}) => {
  const { values } = useFormikContext<FormValues>()
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<Algorithm | null>(
    null
  )

  // Helper to extract plain string from LanguageValueObject
  const extractString = (
    value: string | { '@value': string } | undefined
  ): string => {
    if (typeof value === 'string') return value
    if (value && typeof value === 'object' && '@value' in value)
      return value['@value']
    return ''
  }

  // Initialize from selectedAlgorithmAsset if provided, otherwise from form value
  useEffect(() => {
    if (selectedAlgorithm) return

    if (selectedAlgorithmAsset) {
      const algorithmServices: AlgorithmService[] =
        selectedAlgorithmAsset.credentialSubject?.services?.map(
          (service: Service) => ({
            id: service.id,
            name: extractString(service.name) || service.type,
            title: extractString(service.name) || service.type,
            serviceDescription:
              extractString(service.description) ||
              `Service for ${service.type}`,
            type: service.type,
            duration: service.timeout || 0,
            price: '0',
            symbol: 'OCEAN',
            checked: true
          })
        ) || []

      setSelectedAlgorithm({
        id: selectedAlgorithmAsset.id,
        name:
          extractString(
            selectedAlgorithmAsset.credentialSubject?.metadata?.name
          ) || 'Selected Algorithm',
        description:
          extractString(
            selectedAlgorithmAsset.credentialSubject?.metadata?.description
          ) || 'Algorithm services for compute',
        expanded: true,
        checked: true,
        services: algorithmServices
      })
      return
    }

    if (!values.algorithm) return

    try {
      const parsed = JSON.parse(values.algorithm)
      const algorithmId = parsed?.algoDid || values.algorithm

      setSelectedAlgorithm({
        id: algorithmId,
        name: 'Selected Algorithm',
        description: 'Algorithm services for compute',
        expanded: true,
        checked: true,
        services: [
          {
            id: 'compute-service',
            name: 'Compute Service',
            title: 'Compute Service',
            serviceDescription: 'Service for running compute jobs',
            type: 'compute',
            duration: '3600',
            price: '0',
            symbol: 'OCEAN',
            checked: true
          }
        ]
      })
    } catch (e) {
      // ignore
    }
  }, [values.algorithm, selectedAlgorithm, selectedAlgorithmAsset])

  if (!selectedAlgorithm) {
    return (
      <div className={styles.container}>
        <StepTitle title="Preview Algorithm & Dataset" />
        <p>Please select an algorithm first</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <StepTitle title="Preview Algorithm & Dataset" />

      <div className={styles.previewContainer}>
        {/* Algorithm Section */}
        <div className={styles.algorithmContainer}>
          <div className={styles.algorithmHeader}>
            <h2 className={styles.algorithmName}>{selectedAlgorithm.name}</h2>
            <p className={styles.algorithmAddress}>{selectedAlgorithm.id}</p>
            <p className={styles.algorithmDescription}>
              {selectedAlgorithm.description.slice(0, 40)}
              {selectedAlgorithm.description.length > 40 ? '...' : ''}{' '}
            </p>
          </div>

          <div className={styles.servicesList}>
            {selectedAlgorithm.services.map((service) => (
              <div key={service.id} className={styles.serviceItem}>
                <div className={styles.serviceHeader}>
                  <h3 className={styles.serviceName}>{service.name}</h3>
                </div>
                <p className={styles.serviceDescription}>
                  {service.serviceDescription.slice(0, 40)}
                  {service.serviceDescription.length > 40 ? '...' : ''}
                </p>
                <div className={styles.serviceDetails}>
                  <p>
                    <strong>Type:</strong> {service.type}
                  </p>
                </div>
                <div className={styles.serviceDetails}>
                  <p>
                    <strong>Access duration:</strong>{' '}
                    {Number(service.duration) === 0
                      ? 'Forever'
                      : `${Math.floor(
                          Number(service.duration) / (60 * 60 * 24)
                        )} days`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dataset Section */}
        <div className={styles.datasetContainer}>
          <div className={styles.datasetHeader}>
            <h2 className={styles.datasetName}>Selected Dataset</h2>
            <p className={styles.datasetAddress}>Current dataset asset</p>
            <p className={styles.datasetDescription}>
              This is the dataset you are running the algorithm against
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PreviewAlgorithmDataset
