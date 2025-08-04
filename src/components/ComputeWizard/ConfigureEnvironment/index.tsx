import { ReactElement, useState, useEffect } from 'react'
import { useFormikContext } from 'formik'
import { Datatoken } from '@oceanprotocol/lib'
import { useNetwork, useSigner } from 'wagmi'
import StepTitle from '@shared/StepTitle'
import { FormComputeData } from '../_types'
import { ResourceType } from 'src/@types/ResourceType'
import styles from './index.module.css'

interface ConfigureEnvironmentProps {
  allResourceValues?: { [envId: string]: ResourceType }
  setAllResourceValues?: React.Dispatch<
    React.SetStateAction<{ [envId: string]: ResourceType }>
  >
  computeEnvs?: any[]
}

export default function ConfigureEnvironment({
  allResourceValues = {},
  setAllResourceValues,
  computeEnvs = []
}: ConfigureEnvironmentProps): ReactElement {
  const { values, setFieldValue } = useFormikContext<FormComputeData>()
  const { chain } = useNetwork()
  const { data: signer } = useSigner()

  const [symbolMap, setSymbolMap] = useState<{ [address: string]: string }>({})

  // Get compute environment and related data (like original)
  const envId = values.computeEnv?.id || values.computeEnv
  const env =
    typeof values.computeEnv === 'object'
      ? values.computeEnv
      : computeEnvs?.find((e) => e.id === envId)
  const chainId = chain?.id?.toString() || '11155111'
  const fee = env?.fees?.[chainId]?.[0]
  const freeAvailable = !!env?.free
  const tokenAddress = fee?.feeToken
  const tokenSymbol = symbolMap[tokenAddress] || '...'

  // Get current resource values from real state (like original)
  const envResourceValues = env?.id ? allResourceValues[env.id] : undefined
  const currentMode = (envResourceValues as any)?.currentMode || 'free'
  const currentResourceValues = (envResourceValues as any)?.[currentMode]

  // Debug logging
  console.log('ConfigureEnvironment debug:', {
    envId,
    env: env ? 'found' : 'not found',
    computeEnvs: computeEnvs?.length || 0,
    allResourceValues: Object.keys(allResourceValues),
    currentResourceValues: currentResourceValues ? 'exists' : 'undefined',
    envResources: env?.resources,
    envFree: env?.free,
    envMaxJobDuration: env?.maxJobDuration,
    fullEnv: env,
    valuesComputeEnv: values.computeEnv
  })

  // Initialize environment resource values if not already set (copied from original)
  useEffect(() => {
    if (!values.computeEnv || !env || !setAllResourceValues) {
      console.log('Initialization skipped:', {
        hasComputeEnv: !!values.computeEnv,
        hasEnv: !!env,
        hasSetAllResourceValues: !!setAllResourceValues
      })
      return
    }

    console.log('Initialization check:', {
      envId: env.id,
      hasExistingValues: !!allResourceValues[env.id],
      existingValues: allResourceValues[env.id],
      envResources: env.resources,
      envFree: env.free
    })

    // If not already initialized, set default resource values for both free and paid modes
    if (!allResourceValues[env.id]) {
      // Try to get resources from env.resources first, then env.free.resources
      const freeResources = env.free?.resources || env.resources || []
      const paidResources = env.resources || []

      // Initialize free mode values - start at 0
      const freeCpu = 0
      const freeRam = 0
      const freeDisk = 0
      const jobDuration = 0

      // Initialize paid mode values - start at 0
      const paidCpu = 0
      const paidRam = 0
      const paidDisk = 0

      const newRes = {
        free: {
          cpu: freeCpu,
          ram: freeRam,
          disk: freeDisk,
          jobDuration,
          price: 0,
          mode: 'free'
        },
        paid: {
          cpu: paidCpu,
          ram: paidRam,
          disk: paidDisk,
          jobDuration,
          price: 0,
          mode: 'paid'
        },
        currentMode: 'free' // Track which mode is currently active
      }

      console.log('Initializing new resource values:', newRes)

      setAllResourceValues((prev) => ({
        ...prev,
        [env.id]: newRes
      }))
    }
  }, [values.computeEnv, env, allResourceValues, setAllResourceValues])

  // Update form values when resource values change (like original)
  useEffect(() => {
    if (!currentResourceValues || !currentMode) return

    setFieldValue('cpu', currentResourceValues.cpu)
    setFieldValue('ram', currentResourceValues.ram)
    setFieldValue('disk', currentResourceValues.disk)
    setFieldValue('jobDuration', currentResourceValues.jobDuration)
  }, [currentResourceValues, currentMode, setFieldValue])

  const formatMB = (bytes: number) => Math.floor(bytes / 1_000_000)
  const formatMinutes = (seconds: number) => Math.floor(seconds / 60)

  const fetchSymbol = async (address: string) => {
    if (symbolMap[address]) return symbolMap[address]
    if (!signer || !chain?.id) return '...'
    const datatoken = new Datatoken(signer, chain.id)
    const sym = await datatoken.getSymbol(address)
    setSymbolMap((prev) => ({ ...prev, [address]: sym }))
    return sym
  }

  // Configuration completion check based on real data
  const isConfigurationComplete = !!(
    currentResourceValues &&
    currentResourceValues.cpu > 0 &&
    currentResourceValues.ram > 0 &&
    currentResourceValues.disk > 0 &&
    currentResourceValues.jobDuration > 0
  )

  if (tokenAddress) fetchSymbol(tokenAddress)

  const getLimits = (id: string, isFree: boolean) => {
    const resourceLimits = isFree ? env?.free?.resources : env?.resources
    const found = resourceLimits?.find((r) => r.id === id)
    console.log(`getLimits for ${id} (${isFree ? 'free' : 'paid'}):`, {
      resourceLimits,
      found,
      result: found ?? { max: 0, min: 0 },
      envFree: env?.free,
      envResources: env?.resources
    })
    return found ?? { max: 0, min: 0 }
  }

  // Update resource values in real state (like original)
  const updateResource = (
    type: 'cpu' | 'ram' | 'disk' | 'jobDuration',
    value: number,
    mode: 'free' | 'paid'
  ) => {
    if (!env?.id || !setAllResourceValues) return

    console.log('updateResource called:', { type, value, mode, envId: env.id })

    setAllResourceValues((prev) => {
      const current = (prev[env.id] as any) || {
        free: {
          cpu: 1,
          ram: 1_000_000_000,
          disk: 1_000_000_000,
          jobDuration: 3600,
          price: 0,
          mode: 'free'
        },
        paid: {
          cpu: 1,
          ram: 1_000_000_000,
          disk: 1_000_000_000,
          jobDuration: 3600,
          price: 0,
          mode: 'paid'
        },
        currentMode: 'free'
      }

      return {
        ...prev,
        [env.id]: {
          ...current,
          [mode]: {
            ...current[mode],
            [type]: value
          }
        }
      }
    })

    // Only update form values if this is the current active mode
    if (mode === currentMode) {
      setFieldValue(type, value)
    }
  }

  // Calculate price using real resource values
  const calculatePrice = () => {
    if (!currentResourceValues || currentMode === 'free') return 0
    if (!fee?.prices) return 0

    let totalPrice = 0
    for (const p of fee.prices) {
      const units =
        p.id === 'cpu'
          ? currentResourceValues.cpu
          : p.id === 'ram'
          ? currentResourceValues.ram
          : p.id === 'disk'
          ? currentResourceValues.disk
          : 0
      totalPrice += units * p.price
    }
    return totalPrice * formatMinutes(currentResourceValues.jobDuration)
  }

  const renderResourceRow = (
    resourceId: string,
    label: string,
    unit: string,
    isFree: boolean
  ) => {
    // Special handling for jobDuration - it uses maxJobDuration from env, not resources
    let minValue, maxValue
    if (resourceId === 'jobDuration') {
      minValue = 60 // 1 minute minimum
      maxValue = env?.maxJobDuration || 3600
    } else {
      const limits = getLimits(resourceId, isFree)
      minValue = limits.min
      maxValue = limits.max
    }

    // Get current value from the correct mode
    const mode = isFree ? 'free' : 'paid'
    const modeResourceValues = (envResourceValues as any)?.[mode]
    const currentValue = modeResourceValues?.[resourceId]

    // Use current value, fallback to form value, then to 0
    const fallbackValue =
      currentValue !== undefined ? currentValue : values[resourceId] || 0

    // Debug logging for this resource
    console.log(`Resource ${resourceId} (${isFree ? 'free' : 'paid'}):`, {
      currentValue,
      formValue: values[resourceId],
      fallbackValue,
      minValue,
      maxValue,
      modeResourceValues: modeResourceValues ? 'exists' : 'undefined'
    })

    return (
      <div
        key={`${resourceId}-${isFree ? 'free' : 'paid'}`}
        className={styles.resourceRow}
      >
        <div className={styles.resourceLabel}>{label}</div>
        <div className={styles.sliderSection}>
          <span className={styles.minLabel}>min</span>
          <div className={styles.sliderContainer}>
            <input
              type="range"
              min={minValue}
              max={maxValue}
              value={fallbackValue}
              onChange={(e) =>
                updateResource(
                  resourceId as any,
                  Number(e.target.value),
                  isFree ? 'free' : 'paid'
                )
              }
              disabled={currentMode !== (isFree ? 'free' : 'paid')}
              className={styles.customSlider}
            />
            <div className={styles.sliderLine}></div>
          </div>
          <span className={styles.maxLabel}>max</span>
        </div>
        <div className={styles.inputSection}>
          <input
            type="text"
            value={fallbackValue}
            onChange={(e) =>
              updateResource(
                resourceId as any,
                Number(e.target.value),
                isFree ? 'free' : 'paid'
              )
            }
            disabled={currentMode !== (isFree ? 'free' : 'paid')}
            className={`${styles.input} ${styles.inputSmall}`}
            placeholder="value..."
          />
          <span className={styles.unit}>{unit}</span>
        </div>
        {!isFree && (
          <div className={styles.resourcePriceSection}>
            <span className={styles.priceLabel}>price per time unit</span>
            <input
              type="text"
              className={`${styles.input} ${styles.inputSmall}`}
              placeholder="value..."
              readOnly
              value={fee?.prices?.find((p) => p.id === resourceId)?.price || 0}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <StepTitle title="C2D Environment Configuration" />

      {/* Free Compute Resources Section */}
      <div className={styles.resourceSection}>
        <div className={styles.sectionHeader}>
          <input
            type="radio"
            id="free-resources"
            checked={currentMode === 'free'}
            onChange={() => {
              if (env?.id && setAllResourceValues) {
                setAllResourceValues((prev) => ({
                  ...prev,
                  [env.id]: {
                    ...(prev[env.id] as any),
                    currentMode: 'free',
                    // Reset paid mode's values to 0
                    paid: {
                      cpu: 0,
                      ram: 0,
                      disk: 0,
                      jobDuration: 0,
                      price: 0,
                      mode: 'paid'
                    }
                  }
                }))
              }
            }}
            className={styles.radioButton}
          />
          <label htmlFor="free-resources" className={styles.sectionTitle}>
            Free compute resources
          </label>
        </div>

        <div className={styles.resourceContent}>
          {renderResourceRow('cpu', 'CPU', 'Units', true)}
          {renderResourceRow('ram', 'RAM', 'MB', true)}
          {renderResourceRow('disk', 'DISK', 'MB', true)}
          {renderResourceRow('jobDuration', 'JOB DURATION', 'Minutes', true)}
        </div>
      </div>

      {/* Paid Compute Resources Section */}
      <div className={styles.resourceSection}>
        <div className={styles.sectionHeader}>
          <input
            type="radio"
            id="paid-resources"
            checked={currentMode === 'paid'}
            onChange={() => {
              if (env?.id && setAllResourceValues) {
                setAllResourceValues((prev) => ({
                  ...prev,
                  [env.id]: {
                    ...(prev[env.id] as any),
                    currentMode: 'paid',
                    // Reset free mode's values to 0
                    free: {
                      cpu: 0,
                      ram: 0,
                      disk: 0,
                      jobDuration: 0,
                      price: 0,
                      mode: 'free'
                    }
                  }
                }))
              }
            }}
            className={styles.radioButton}
          />
          <label htmlFor="paid-resources" className={styles.sectionTitle}>
            Paid compute resources
          </label>
        </div>

        <div className={styles.resourceContent}>
          {renderResourceRow('cpu', 'CPU', '', false)}
          {renderResourceRow('ram', 'RAM', '', false)}
          {renderResourceRow('disk', 'DISK', '', false)}
          {renderResourceRow('jobDuration', 'JOB DURATION', '', false)}
        </div>
      </div>

      {/* C2D Environment Price Section */}
      <div className={styles.priceSection}>
        <h3 className={styles.priceTitle}>C2D Environment Price</h3>
        <div className={styles.priceDisplay}>
          <input
            type="text"
            value={calculatePrice()}
            readOnly
            className={`${styles.input} ${styles.inputLarge}`}
            placeholder="0"
          />
          <div className={styles.priceInfo}>
            <span>
              Calculated based on the unit price for each resource and the Job
              duration selected
            </span>
          </div>
        </div>
      </div>

      {/* Configuration Status */}
      {!isConfigurationComplete && (
        <div className={styles.configurationWarning}>
          <p>
            Please configure all resource values (CPU, RAM, Disk, Job Duration)
            to continue.
          </p>
        </div>
      )}
    </div>
  )
}
