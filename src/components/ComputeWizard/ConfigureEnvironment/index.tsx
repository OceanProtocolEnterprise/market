import {
  ReactElement,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef
} from 'react'
import { Field, useFormikContext } from 'formik'
import { Datatoken } from '@oceanprotocol/lib'
import { ResourceType } from 'src/@types/ResourceType'
import { useChainId } from 'wagmi'
import StepTitle from '@shared/StepTitle'
import { FormComputeData } from '../_types'
import { useProfile } from '@context/Profile'
import styles from './index.module.css'
import { useEthersSigner } from '@hooks/useEthersSigner'
import Input from '@components/@shared/FormInput'
import Decimal from 'decimal.js'
import { MAX_DECIMALS } from '@utils/constants'

interface ResourceValues {
  cpu: number
  ram: number
  disk: number
  gpu: number
  jobDuration: number
}

interface ResourceRowProps {
  resourceId: string
  label: string
  unit: string
  isFree: boolean
  freeValues: ResourceValues
  paidValues: ResourceValues
  getLimits: (
    id: string,
    isFree: boolean
  ) => { minValue: number; maxValue: number; step?: number }
  updateResource: (
    type: 'cpu' | 'ram' | 'disk' | 'gpu' | 'jobDuration',
    value: number | string,
    isFree: boolean
  ) => void
  fee?: { prices?: { id: string; price: number }[] }
  tooltip?: string
}

const hasGPUResource = (env: any): boolean => {
  if (!env) return false

  if (
    env.resources?.some(
      (r: any) => r.type === 'gpu' || r.id?.toLowerCase().includes('gpu')
    )
  ) {
    return true
  }

  if (
    env.free?.resources?.some(
      (r: any) => r.type === 'gpu' || r.id?.toLowerCase().includes('gpu')
    )
  ) {
    return true
  }

  if (env.fees) {
    for (const chainId in env.fees) {
      const feeConfigs = env.fees[chainId]
      for (const feeConfig of feeConfigs) {
        if (
          feeConfig.prices?.some((p: any) =>
            p.id?.toLowerCase().includes('gpu')
          )
        ) {
          return true
        }
      }
    }
  }

  return false
}

function ResourceRow({
  resourceId,
  label,
  unit,
  isFree,
  freeValues,
  paidValues,
  getLimits,
  updateResource,
  fee,
  tooltip
}: ResourceRowProps): ReactElement {
  const { minValue, maxValue, step = 1 } = getLimits(resourceId, isFree)
  const currentValue = isFree
    ? freeValues[resourceId as keyof ResourceValues]
    : paidValues[resourceId as keyof ResourceValues]
  const [inputValue, setInputValue] = useState<string | number>(currentValue)
  const [error, setError] = useState<string | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)
  const labelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setInputValue(currentValue)
    setError(null)
  }, [currentValue])

  const handleBlur = () => {
    if (inputValue === '') {
      setError(
        `Value cannot be empty. Please enter a number between ${minValue} and ${maxValue}.`
      )
      setInputValue(currentValue)
      return
    }

    const numValue = Number(inputValue)
    if (isNaN(numValue)) {
      setError(
        `Please enter a valid number between ${minValue} and ${maxValue}.`
      )
      setInputValue(currentValue)
      return
    }

    if (numValue < minValue || numValue > maxValue) {
      setError(`Please enter a value between ${minValue} and ${maxValue}.`)
      setInputValue(currentValue)
      return
    }

    updateResource(
      resourceId as 'cpu' | 'ram' | 'disk' | 'gpu' | 'jobDuration',
      numValue,
      isFree
    )
    setError(null)
  }

  const handleCloseError = () => {
    setError(null)
    setInputValue(currentValue)
  }

  return (
    <div
      key={`${resourceId}-${isFree ? 'free' : 'paid'}`}
      className={styles.resourceRow}
    >
      <div
        className={styles.labelContainer}
        ref={labelRef}
        onMouseEnter={() => tooltip && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span className={styles.labelText}>{label}</span>
        {tooltip && <span className={styles.infoIcon}>ⓘ</span>}
        {showTooltip && tooltip && (
          <div className={styles.resourceTooltip}>
            <div className={styles.resourceTooltipContent}>{tooltip}</div>
            <div className={styles.resourceTooltipArrow} />
          </div>
        )}
      </div>
      <div className={styles.sliderSection}>
        <span className={styles.minLabel}>min</span>
        <div className={styles.sliderContainer}>
          <input
            type="range"
            min={minValue}
            max={maxValue}
            step={step}
            value={currentValue}
            onChange={(e) =>
              updateResource(
                resourceId as 'cpu' | 'ram' | 'disk' | 'gpu' | 'jobDuration',
                Number(e.target.value),
                isFree
              )
            }
            className={styles.customSlider}
          />
          <div className={styles.sliderLine}></div>
        </div>
        <span className={styles.maxLabel}>max</span>
      </div>
      <div className={styles.inputSection}>
        <input
          type="number"
          min={minValue}
          max={maxValue}
          step={step}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setError(null)
          }}
          onBlur={handleBlur}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleBlur()
            }
          }}
          className={`${styles.input} ${styles.inputSmall} ${
            error ? styles.inputError : ''
          }`}
          placeholder="value..."
        />
        <span className={styles.unit}>{unit}</span>
      </div>
      {error && (
        <div className={styles.errorOverlay}>
          <div className={styles.errorPopup}>
            <span className={styles.errorMessage}>{error}</span>
            <button className={styles.closeButton} onClick={handleCloseError}>
              &times;
            </button>
          </div>
        </div>
      )}
      {!isFree && resourceId !== 'jobDuration' && (
        <div className={styles.resourcePriceSection}>
          <span className={styles.priceLabel}>price per time unit</span>
          <input
            type="text"
            className={`${styles.input} ${styles.inputSmall}`}
            placeholder="value..."
            readOnly
            value={fee?.prices?.find((p) => p.id === resourceId)?.price ?? 0}
          />
        </div>
      )}
    </div>
  )
}

export default function ConfigureEnvironment({
  allResourceValues,
  setAllResourceValues,
  baseTokenAddress,
  setBaseTokenAddress
}: {
  allResourceValues?: Record<string, ResourceType>
  setAllResourceValues?: (values: Record<string, any>) => void
  baseTokenAddress: string
  setBaseTokenAddress: React.Dispatch<React.SetStateAction<string>>
}): ReactElement {
  const { values, setFieldValue } = useFormikContext<FormComputeData>()
  const chainId = useChainId()
  const { escrowFundsByToken } = useProfile()
  const walletClient = useEthersSigner()
  const [symbolMap, setSymbolMap] = useState<Record<string, string>>({})

  const gpuAvailable = useMemo(
    () => hasGPUResource(values.computeEnv),
    [values.computeEnv]
  )

  const fetchSymbol = useCallback(
    async (address: string) => {
      if (symbolMap[address]) return symbolMap[address]
      if (!walletClient || !chainId) return address

      try {
        const datatoken = new Datatoken(walletClient as any, chainId)
        const sym = await datatoken.getSymbol(address)
        setSymbolMap((prev) => ({ ...prev, [address]: sym }))
        return sym
      } catch (e) {
        return address
      }
    },
    [walletClient, chainId, symbolMap]
  )

  const supportedTokensFromEnv = useMemo(() => {
    const currentChainId =
      chainId?.toString() || values.user?.chainId?.toString()
    if (!values.computeEnv || !currentChainId) return []
    const fees = values.computeEnv.fees?.[currentChainId] || []
    return fees.map((f) => f.feeToken)
  }, [values.computeEnv, chainId, values.user?.chainId])

  useEffect(() => {
    supportedTokensFromEnv.forEach((tokenAddr) => {
      if (!symbolMap[tokenAddr]) fetchSymbol(tokenAddr)
    })
  }, [supportedTokensFromEnv, fetchSymbol, symbolMap])

  const isTokenListLoading = useMemo(
    () =>
      supportedTokensFromEnv.length > 0 &&
      supportedTokensFromEnv.some((addr) => !symbolMap[addr]),
    [supportedTokensFromEnv, symbolMap]
  )

  const baseTokenOptions = useMemo(
    () =>
      isTokenListLoading
        ? ['Loading tokens...']
        : supportedTokensFromEnv.map((addr) => symbolMap[addr] || addr),
    [supportedTokensFromEnv, symbolMap, isTokenListLoading]
  )

  const displaySymbol = symbolMap[values.baseToken] ?? 'OCEAN'

  const escrowAvailableFunds = useMemo(() => {
    if (!displaySymbol) return 0
    const funds = escrowFundsByToken[displaySymbol]
    if (!funds?.available) return 0
    // Avoid floating rounding up (e.g. 2.9999999999 -> 3)
    return new Decimal(funds.available)
      .toDecimalPlaces(MAX_DECIMALS, Decimal.ROUND_DOWN)
      .toNumber()
  }, [escrowFundsByToken, displaySymbol])

  const escrowAvailableFundsDisplay = useMemo(() => {
    if (!displaySymbol) return '0'
    const funds = escrowFundsByToken[displaySymbol]
    if (!funds?.available) return '0'
    return new Decimal(funds.available)
      .toDecimalPlaces(MAX_DECIMALS, Decimal.ROUND_DOWN)
      .toFixed(3)
  }, [escrowFundsByToken, displaySymbol])

  const [mode, setMode] = useState<'free' | 'paid'>(
    () =>
      (values.mode as 'free' | 'paid') ||
      (values.computeEnv?.free ? 'free' : 'paid')
  )

  useEffect(() => {
    setFieldValue('mode', mode)
  }, [mode, setFieldValue])

  useEffect(() => {
    if (values.baseToken || supportedTokensFromEnv.length === 0) return
    const defaultToken = supportedTokensFromEnv[0]
    setFieldValue('baseToken', defaultToken)
    setBaseTokenAddress(defaultToken)
  }, [
    supportedTokensFromEnv,
    values.baseToken,
    setFieldValue,
    setBaseTokenAddress
  ])

  useEffect(() => {
    if (!values.baseToken || values.baseToken === baseTokenAddress) return
    setBaseTokenAddress(values.baseToken)
  }, [values.baseToken, baseTokenAddress, setBaseTokenAddress])

  const getEnvResourceValues = useCallback(
    (isFree = true): ResourceValues => {
      const env = values.computeEnv
      if (!env) return { cpu: 0, ram: 0, disk: 0, gpu: 0, jobDuration: 0 }

      const envId = typeof env === 'string' ? env : env.id
      const modeKey = isFree ? 'free' : 'paid'
      const envResourceValues = allResourceValues?.[`${envId}_${modeKey}`]

      const resourceSource = isFree ? env.free?.resources : env.resources

      return {
        cpu: isFree
          ? envResourceValues?.cpu ?? 0
          : envResourceValues?.cpu && envResourceValues.cpu > 0
          ? envResourceValues.cpu
          : env.resources?.find((r) => r.id === 'cpu')?.min ?? 1,
        ram: isFree
          ? envResourceValues?.ram ?? 0
          : envResourceValues?.ram && envResourceValues.ram > 0
          ? envResourceValues.ram
          : env.resources?.find((r) => r.id === 'ram')?.min ?? 1,
        disk: isFree
          ? envResourceValues?.disk ?? 0
          : envResourceValues?.disk && envResourceValues.disk > 0
          ? envResourceValues.disk
          : env.resources?.find((r) => r.id === 'disk')?.min ?? 0,
        gpu: isFree
          ? envResourceValues?.gpu ?? 0
          : envResourceValues?.gpu && envResourceValues.gpu > 0
          ? envResourceValues.gpu
          : (() => {
              const source = isFree ? env.free?.resources : env.resources
              const gpuResource = source?.find(
                (r) => r.type === 'gpu' || r.id?.toLowerCase().includes('gpu')
              )
              return gpuResource?.min ?? 0
            })(),
        jobDuration: isFree
          ? envResourceValues?.jobDuration ?? 0
          : envResourceValues?.jobDuration && envResourceValues.jobDuration > 0
          ? envResourceValues.jobDuration
          : 1
      }
    },
    [values.computeEnv, allResourceValues]
  )

  const [freeValues, setFreeValues] = useState<ResourceValues>(() =>
    getEnvResourceValues(true)
  )
  const [paidValues, setPaidValues] = useState<ResourceValues>(() =>
    getEnvResourceValues(false)
  )

  const isGpuSelected = useMemo(() => {
    const currentValues = mode === 'free' ? freeValues : paidValues
    return currentValues.gpu > 0
  }, [mode, freeValues.gpu, paidValues.gpu])

  const round3 = (v: number) => Math.round((v + Number.EPSILON) * 1000) / 1000
  const roundUp3 = (v: number) =>
    new Decimal(v).toDecimalPlaces(3, Decimal.ROUND_UP).toNumber()

  const getLimits = (id: string, isFree: boolean) => {
    const env = values.computeEnv
    if (!env) return { minValue: 0, maxValue: 0 }

    if (id === 'jobDuration') {
      const maxDuration = isFree ? env.free?.maxJobDuration : env.maxJobDuration
      return {
        minValue: 1,
        maxValue: Math.floor((maxDuration ?? 3600) / 60),
        step: 1
      }
    }

    const resourceLimits = isFree ? env.free?.resources : env.resources
    if (!resourceLimits) return { minValue: 0, maxValue: 0 }

    let resource
    if (id === 'gpu') {
      resource = resourceLimits.find(
        (r) => r.type === 'gpu' || r.id?.toLowerCase().includes('gpu')
      )
    } else {
      resource = resourceLimits.find((r) => r.id === id)
    }

    if (!resource) return { minValue: 0, maxValue: 0 }

    const available = Math.max(
      0,
      ((resource.max || resource.total) ?? 0) - (resource.inUse ?? 0)
    )

    return {
      minValue: resource.min ?? 0,
      maxValue: available,
      step: id === 'ram' || id === 'disk' ? 0.1 : 1
    }
  }

  const calculatePrice = useCallback(() => {
    if (mode === 'free') return 0
    if (!values.computeEnv) return 0

    const env = values.computeEnv
    const currentChainId = chainId?.toString() ?? '11155111'
    const fee =
      env.fees?.[currentChainId]?.find(
        (f) => f.feeToken.toLowerCase() === values.baseToken?.toLowerCase()
      ) || env.fees?.[currentChainId]?.[0]

    if (!fee?.prices) return 0

    let totalPrice = 0
    for (const p of fee.prices) {
      const units =
        p.id === 'cpu'
          ? paidValues.cpu
          : p.id === 'ram'
          ? paidValues.ram
          : p.id === 'disk'
          ? paidValues.disk
          : p.id === 'gpu' || p.id?.toLowerCase().includes('gpu')
          ? paidValues.gpu
          : 0
      totalPrice += units * p.price
    }

    const rawPrice = totalPrice * paidValues.jobDuration
    return Math.round(rawPrice * 100) / 100
  }, [mode, values.computeEnv, chainId, paidValues, values.baseToken])

  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, val))

  useEffect(() => {
    const currentValues = mode === 'free' ? freeValues : paidValues
    if (!currentValues) return
    setFieldValue('cpu', currentValues.cpu)
    setFieldValue('ram', currentValues.ram)
    setFieldValue('disk', currentValues.disk)
    if (gpuAvailable) {
      setFieldValue('gpu', currentValues.gpu)
    }
    setFieldValue('jobDuration', currentValues.jobDuration)
  }, [
    mode,
    freeValues.cpu,
    freeValues.ram,
    freeValues.disk,
    freeValues.gpu,
    freeValues.jobDuration,
    paidValues.cpu,
    paidValues.ram,
    paidValues.disk,
    paidValues.gpu,
    paidValues.jobDuration,
    setFieldValue,
    gpuAvailable
  ])

  useEffect(() => {
    if (mode === 'paid') {
      const jobPrice = calculatePrice()
      const availableEscrow = escrowAvailableFunds
      const actualPaymentAmount = Math.max(0, jobPrice - availableEscrow)
      setFieldValue('jobPrice', jobPrice)
      setFieldValue('escrowFunds', escrowAvailableFunds)
      setFieldValue('actualPaymentAmount', actualPaymentAmount)
      setFieldValue('escrowCoveredAmount', Math.min(availableEscrow, jobPrice))
    } else {
      setFieldValue('jobPrice', 0)
      setFieldValue('escrowFunds', 0)
      setFieldValue('actualPaymentAmount', 0)
      setFieldValue('escrowCoveredAmount', 0)
    }
  }, [mode, calculatePrice, escrowAvailableFunds, setFieldValue])

  useEffect(() => {
    if (!setAllResourceValues || !values.computeEnv) return

    const env = values.computeEnv
    const envId = typeof env === 'string' ? env : env.id
    const modeKey = mode === 'free' ? 'free' : 'paid'
    const currentValues = mode === 'free' ? freeValues : paidValues

    let currentPrice = 0
    let actualPaymentAmount = 0
    let escrowCoveredAmount = 0

    if (mode === 'paid') {
      const currentChainId = chainId?.toString() ?? '11155111'
      const fee =
        env.fees?.[currentChainId]?.find(
          (f) => f.feeToken.toLowerCase() === values.baseToken?.toLowerCase()
        ) || env.fees?.[currentChainId]?.[0]
      if (fee?.prices) {
        let totalPrice = 0
        for (const p of fee.prices) {
          const units =
            p.id === 'cpu'
              ? currentValues.cpu
              : p.id === 'ram'
              ? currentValues.ram
              : p.id === 'disk'
              ? currentValues.disk
              : p.id === 'gpu' || p.id?.toLowerCase().includes('gpu')
              ? currentValues.gpu
              : 0
          totalPrice += units * p.price
        }
        currentPrice = round3(totalPrice * currentValues.jobDuration)
        const availableEscrow = escrowAvailableFunds
        actualPaymentAmount = roundUp3(
          Math.max(0, currentPrice - availableEscrow)
        )
        escrowCoveredAmount = round3(Math.min(availableEscrow, currentPrice))
      }
    }

    const resourceValues: any = {
      cpu: currentValues.cpu,
      ram: currentValues.ram,
      disk: currentValues.disk,
      jobDuration: currentValues.jobDuration,
      mode,
      price: actualPaymentAmount.toString(),
      fullJobPrice: currentPrice.toString(),
      actualPaymentAmount: actualPaymentAmount.toString(),
      escrowCoveredAmount: escrowCoveredAmount.toString()
    }

    if (gpuAvailable) {
      resourceValues.gpu = currentValues.gpu
    }

    setAllResourceValues((prev) => ({
      ...prev,
      [`${envId}_${modeKey}`]: resourceValues
    }))
  }, [
    mode,
    values.computeEnv,
    chainId,
    freeValues.cpu,
    freeValues.ram,
    freeValues.disk,
    freeValues.gpu,
    freeValues.jobDuration,
    paidValues.cpu,
    paidValues.ram,
    paidValues.disk,
    paidValues.gpu,
    paidValues.jobDuration,
    setAllResourceValues,
    escrowAvailableFunds,
    values.baseToken,
    gpuAvailable
  ])

  useEffect(() => {
    const env = values.computeEnv
    if (!env) return

    const envId = typeof env === 'string' ? env : env.id
    const freeExistingValues = allResourceValues?.[`${envId}_free`]
    const paidExistingValues = allResourceValues?.[`${envId}_paid`]

    const freeEnvValues = getEnvResourceValues(true)
    const paidEnvValues = getEnvResourceValues(false)

    const freeRaw = {
      cpu:
        freeExistingValues?.cpu && freeExistingValues.cpu > 0
          ? freeExistingValues.cpu
          : freeEnvValues.cpu,
      ram:
        freeExistingValues?.ram && freeExistingValues.ram > 0
          ? freeExistingValues.ram
          : freeEnvValues.ram,
      disk:
        freeExistingValues?.disk && freeExistingValues.disk > 0
          ? freeExistingValues.disk
          : freeEnvValues.disk,
      gpu:
        freeExistingValues?.gpu && freeExistingValues.gpu > 0
          ? freeExistingValues.gpu
          : freeEnvValues.gpu,
      jobDuration:
        freeExistingValues?.jobDuration && freeExistingValues.jobDuration > 0
          ? freeExistingValues.jobDuration
          : freeEnvValues.jobDuration
    }

    const paidRaw = {
      cpu:
        paidExistingValues?.cpu && paidExistingValues.cpu > 0
          ? paidExistingValues.cpu
          : paidEnvValues.cpu,
      ram:
        paidExistingValues?.ram && paidExistingValues.ram > 0
          ? paidExistingValues.ram
          : paidEnvValues.ram,
      disk:
        paidExistingValues?.disk && paidExistingValues.disk > 0
          ? paidExistingValues.disk
          : paidEnvValues.disk,
      gpu:
        paidExistingValues?.gpu && paidExistingValues.gpu > 0
          ? paidExistingValues.gpu
          : paidEnvValues.gpu,
      jobDuration:
        paidExistingValues?.jobDuration && paidExistingValues.jobDuration > 0
          ? paidExistingValues.jobDuration
          : paidEnvValues.jobDuration
    }

    const freeLimits = {
      cpu: getLimits('cpu', true),
      ram: getLimits('ram', true),
      disk: getLimits('disk', true),
      gpu: getLimits('gpu', true),
      jobDuration: getLimits('jobDuration', true)
    }

    const paidLimits = {
      cpu: getLimits('cpu', false),
      ram: getLimits('ram', false),
      disk: getLimits('disk', false),
      gpu: getLimits('gpu', false),
      jobDuration: getLimits('jobDuration', false)
    }

    setFreeValues({
      cpu: clamp(freeRaw.cpu, freeLimits.cpu.minValue, freeLimits.cpu.maxValue),
      ram: clamp(freeRaw.ram, freeLimits.ram.minValue, freeLimits.ram.maxValue),
      disk: clamp(
        freeRaw.disk,
        freeLimits.disk.minValue,
        freeLimits.disk.maxValue
      ),
      gpu: clamp(freeRaw.gpu, freeLimits.gpu.minValue, freeLimits.gpu.maxValue),
      jobDuration: clamp(
        freeRaw.jobDuration,
        freeLimits.jobDuration.minValue,
        freeLimits.jobDuration.maxValue
      )
    })

    setPaidValues({
      cpu: clamp(paidRaw.cpu, paidLimits.cpu.minValue, paidLimits.cpu.maxValue),
      ram: clamp(paidRaw.ram, paidLimits.ram.minValue, paidLimits.ram.maxValue),
      disk: clamp(
        paidRaw.disk,
        paidLimits.disk.minValue,
        paidLimits.disk.maxValue
      ),
      gpu: clamp(paidRaw.gpu, paidLimits.gpu.minValue, paidLimits.gpu.maxValue),
      jobDuration: clamp(
        paidRaw.jobDuration,
        paidLimits.jobDuration.minValue,
        paidLimits.jobDuration.maxValue
      )
    })
  }, [values.computeEnv, allResourceValues, getEnvResourceValues])

  if (!values.computeEnv) {
    return (
      <div className={styles.container}>
        <StepTitle title="C2D Environment Configuration" />
        <p>Please select an environment first</p>
      </div>
    )
  }

  const env = values.computeEnv
  const currentChainId = chainId?.toString() ?? '11155111'
  const fee =
    env.fees?.[currentChainId]?.find(
      (f) => f.feeToken.toLowerCase() === values.baseToken?.toLowerCase()
    ) || env.fees?.[currentChainId]?.[0]
  const freeAvailable = !!env.free

  const updateResource = (
    type: 'cpu' | 'ram' | 'disk' | 'gpu' | 'jobDuration',
    value: number | string,
    isFree: boolean
  ) => {
    const { minValue, maxValue, step } = getLimits(type, isFree)

    if (value === '' || isNaN(Number(value))) return

    const validatedValue = clamp(Number(value), minValue, maxValue)

    const adjustedValue =
      step && (type === 'ram' || type === 'disk' || type === 'gpu')
        ? Number(validatedValue.toFixed(1))
        : Math.floor(validatedValue)

    if (isFree) {
      setFreeValues((prev) => ({ ...prev, [type]: adjustedValue }))
    } else {
      setPaidValues((prev) => ({ ...prev, [type]: adjustedValue }))
    }
  }

  const getResourceDescription = (resourceId: string): string | undefined => {
    const env = values.computeEnv
    if (!env) return undefined

    const resource = env.resources?.find((r) =>
      resourceId === 'gpu'
        ? r.type === 'gpu' || r.id?.toLowerCase().includes('gpu')
        : r.id === resourceId
    )
    if (resource?.description) {
      return resource.description
    }
    const freeResource = env.free?.resources?.find((r) =>
      resourceId === 'gpu'
        ? r.type === 'gpu' || r.id?.toLowerCase().includes('gpu')
        : r.id === resourceId
    )

    return freeResource?.description
  }

  return (
    <div className={styles.container}>
      <StepTitle title="C2D Environment Configuration" />

      <Field
        label="Price Token"
        component={Input}
        name="baseToken"
        type="select"
        options={baseTokenOptions}
        value={
          isTokenListLoading
            ? 'Loading tokens...'
            : symbolMap[values.baseToken] || values.baseToken || ''
        }
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
          const selectedAddr = supportedTokensFromEnv.find(
            (addr) => (symbolMap[addr] || addr) === e.target.value
          )
          if (selectedAddr) {
            setFieldValue('baseToken', selectedAddr)
            setBaseTokenAddress(selectedAddr)
          }
        }}
        disabled={isTokenListLoading}
      />

      {freeAvailable && (
        <div className={styles.resourceSection}>
          <div className={styles.sectionHeader}>
            <input
              type="radio"
              id="free-resources"
              checked={mode === 'free'}
              onChange={() => setMode('free')}
              className={styles.radioButton}
            />
            <label htmlFor="free-resources" className={styles.sectionTitle}>
              Free compute resources
            </label>
          </div>

          <div className={styles.resourceContent}>
            <ResourceRow
              resourceId="cpu"
              label="CPU"
              unit="Units"
              isFree={true}
              freeValues={freeValues}
              paidValues={paidValues}
              getLimits={getLimits}
              updateResource={updateResource}
              fee={fee}
              tooltip={getResourceDescription('cpu')}
            />
            {gpuAvailable && (
              <ResourceRow
                resourceId="gpu"
                label="GPU"
                unit="Units"
                isFree={true}
                freeValues={freeValues}
                paidValues={paidValues}
                getLimits={getLimits}
                updateResource={updateResource}
                fee={fee}
                tooltip={getResourceDescription('gpu')}
              />
            )}
            <ResourceRow
              resourceId="ram"
              label="RAM"
              unit="GB"
              isFree={true}
              freeValues={freeValues}
              paidValues={paidValues}
              getLimits={getLimits}
              updateResource={updateResource}
              fee={fee}
            />
            <ResourceRow
              resourceId="disk"
              label="DISK"
              unit="GB"
              isFree={true}
              freeValues={freeValues}
              paidValues={paidValues}
              getLimits={getLimits}
              updateResource={updateResource}
              fee={fee}
            />
            <ResourceRow
              resourceId="jobDuration"
              label="JOB DURATION"
              unit="Minutes"
              isFree={true}
              freeValues={freeValues}
              paidValues={paidValues}
              getLimits={getLimits}
              updateResource={updateResource}
              fee={fee}
            />
          </div>
        </div>
      )}

      <div className={styles.resourceSection}>
        <div className={styles.sectionHeader}>
          <input
            type="radio"
            id="paid-resources"
            checked={mode === 'paid'}
            onChange={() => setMode('paid')}
            className={styles.radioButton}
          />
          <label htmlFor="paid-resources" className={styles.sectionTitle}>
            Paid compute resources
          </label>
        </div>

        <div className={styles.resourceContent}>
          <ResourceRow
            resourceId="cpu"
            label="CPU"
            unit="Units"
            isFree={false}
            freeValues={freeValues}
            paidValues={paidValues}
            getLimits={getLimits}
            updateResource={updateResource}
            fee={fee}
            tooltip={getResourceDescription('cpu')}
          />
          {gpuAvailable && (
            <ResourceRow
              resourceId="gpu"
              label="GPU"
              unit="Units"
              isFree={false}
              freeValues={freeValues}
              paidValues={paidValues}
              getLimits={getLimits}
              updateResource={updateResource}
              fee={fee}
              tooltip={getResourceDescription('gpu')}
            />
          )}
          <ResourceRow
            resourceId="ram"
            label="RAM"
            unit="GB"
            isFree={false}
            freeValues={freeValues}
            paidValues={paidValues}
            getLimits={getLimits}
            updateResource={updateResource}
            fee={fee}
          />
          <ResourceRow
            resourceId="disk"
            label="DISK"
            unit="GB"
            isFree={false}
            freeValues={freeValues}
            paidValues={paidValues}
            getLimits={getLimits}
            updateResource={updateResource}
            fee={fee}
          />
          <ResourceRow
            resourceId="jobDuration"
            label="JOB DURATION"
            unit="Minutes"
            isFree={false}
            freeValues={freeValues}
            paidValues={paidValues}
            getLimits={getLimits}
            updateResource={updateResource}
            fee={fee}
          />
        </div>
      </div>

      <div className={styles.priceSection}>
        <h3 className={styles.priceTitle}>C2D Environment Price</h3>
        <div className={styles.priceDisplay}>
          <input
            type="text"
            value={calculatePrice().toFixed(3)}
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

      {(isGpuSelected || mode === 'paid') && (
        <div className={styles.messagesContainer}>
          {isGpuSelected && (
            <div className={styles.gpuWarning}>
              <div className={styles.gpuWarningIcon}>⚠️</div>
              <div className={styles.gpuWarningContent}>
                <strong>Please Attention!.</strong> You selected an environment
                with allocated GPU units. Ensure the GPU type is compatible with
                the GPU libraries used in the algorithm`s Docker image.
              </div>
            </div>
          )}

          {mode === 'paid' && (
            <div className={styles.escrowValidation}>
              {(() => {
                const jobPrice = new Decimal(calculatePrice())
                const availableEscrow = new Decimal(escrowAvailableFunds)
                if (jobPrice.gt(availableEscrow)) {
                  const deltaAmount = jobPrice.minus(availableEscrow)
                  const deltaDisplay = deltaAmount.lt(0.001)
                    ? '<0.001'
                    : deltaAmount
                        .toDecimalPlaces(3, Decimal.ROUND_UP)
                        .toFixed(3)
                  return (
                    <div className={styles.insufficientEscrow}>
                      <p>
                        Insufficient escrow balance. An additional{' '}
                        <strong>
                          {deltaDisplay} {displaySymbol}
                        </strong>{' '}
                        will be added to your escrow account to cover this job.
                      </p>
                      <p className={styles.escrowBreakdown}>
                        Job cost: {jobPrice.toFixed(3)} {displaySymbol} |
                        Available escrow: {escrowAvailableFundsDisplay}{' '}
                        {displaySymbol} | Additional needed: {deltaDisplay}{' '}
                        {displaySymbol}
                      </p>
                    </div>
                  )
                }

                return (
                  <div className={styles.sufficientEscrow}>
                    <p>Sufficient escrow balance available for this job.</p>
                    <p className={styles.escrowBreakdown}>
                      Job cost: {jobPrice.toFixed(3)} {displaySymbol} |
                      Available escrow: {escrowAvailableFundsDisplay}{' '}
                      {displaySymbol}
                    </p>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
