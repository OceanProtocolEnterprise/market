'use client'

import { ReactElement, useCallback, useEffect, useMemo, useState } from 'react'
import { Field, useFormikContext } from 'formik'
import StepTitle from '@shared/StepTitle'
import Input from '@shared/FormInput'
import FormErrorGroup from '@shared/FormInput/CheckboxGroupWithErrors'
import Loader from '@components/@shared/atoms/Loader'
import { AssetActionCheckCredentials } from '@components/Asset/AssetActions/CheckCredentials'
import { AssetActionCheckCredentialsAlgo } from '@components/Asset/AssetActions/CheckCredentials/checkCredentialsAlgo'
import { CredentialDialogProvider } from '@components/Asset/AssetActions/Compute/CredentialDialogProvider'
import { useAccount } from 'wagmi'
import useBalance from '@hooks/useBalance'
import { useSsiWallet } from '@context/SsiWallet'
import { useCancelToken } from '@hooks/useCancelToken'
import { useAsset } from '@context/Asset'
import { useUserPreferences } from '@context/UserPreferences'
import { getAccessDetails } from '@utils/accessDetailsAndPricing'
import { getFixedBuyPrice } from '@utils/ocean/fixedRateExchange'
import { getOceanConfig } from '@utils/ocean'
import { getTokenInfo, getTokenBalanceFromSymbol } from '@utils/wallet'
import { compareAsBN } from '@utils/numbers'
import { requiresSsi } from '@utils/credentials'
import { getFeeTooltip } from '@utils/feeTooltips'
import { getAsset } from '@utils/aquarius'
import { getBaseTokenSymbol } from '@utils/getBaseTokenSymbol'
import { AssetExtended } from 'src/@types/AssetExtended'
import { Service } from 'src/@types/ddo/Service'
import { ComputeEnvironment, ProviderFees } from '@oceanprotocol/lib'
import { ResourceType } from 'src/@types/ResourceType'
import { Asset } from 'src/@types/Asset'
import { Signer, formatUnits } from 'ethers'
import Decimal from 'decimal.js'
import { consumeMarketOrderFee } from 'app.config.cjs'
import { MAX_DECIMALS } from '@utils/constants'
import PricingRow from './PricingRow'
import styles from './index.module.css'
import { AssetSelectionAsset } from '@shared/FormInput/InputElement/AssetSelection'
import { ComputeFlow, FormComputeData } from '../_types'

type VerificationStatus =
  | 'verified'
  | 'checking'
  | 'failed'
  | 'expired'
  | 'unverified'

interface VerificationItem {
  id: string
  type: 'dataset' | 'algorithm'
  asset: AssetExtended
  service: Service
  status: VerificationStatus
  index: number
  price: string
  duration: string
  name: string
  symbol?: string
}

type TotalPriceEntry = { value: string; symbol: string }

type ReviewProps = {
  flow: ComputeFlow
  asset: AssetExtended
  service: Service
  accessDetails: AccessDetails
  computeEnvs: ComputeEnvironment[]
  isConsumable: boolean
  hasPreviousOrder: boolean
  hasDatatoken: boolean
  dtBalance: string
  isAccountIdWhitelisted: boolean
  datasetSymbol?: string
  algorithmSymbol?: string
  providerFeesSymbol?: string
  assetTimeout?: string
  totalPrices?: TotalPriceEntry[]
  datasetOrderPrice?: string
  algoOrderPrice?: string
  datasetOrderPriceAndFees?: OrderPriceAndFees
  algoOrderPriceAndFees?: OrderPriceAndFees
  datasetProviderFeeProp?: string
  algorithmProviderFeeProp?: string
  datasetProviderFees?: ProviderFees[]
  algorithmProviderFees?: ProviderFees | null
  isBalanceSufficient: boolean
  setIsBalanceSufficient: React.Dispatch<React.SetStateAction<boolean>>
  allResourceValues: {
    [envId: string]: ResourceType
  }
  setAllResourceValues: React.Dispatch<
    React.SetStateAction<{
      [envId: string]: ResourceType
    }>
  >
  isRequestingPrice?: boolean
  signer?: Signer
  algorithms?: AssetSelectionAsset[]
  ddoListAlgorithms?: Asset[]
  selectedAlgorithmAsset?: AssetExtended
  setSelectedAlgorithmAsset?: React.Dispatch<
    React.SetStateAction<AssetExtended>
  >
  isLoading?: boolean
  isComputeButtonDisabled?: boolean
  hasPreviousOrderSelectedComputeAsset?: boolean
  hasDatatokenSelectedComputeAsset?: boolean
  dtSymbolSelectedComputeAsset?: string
  dtBalanceSelectedComputeAsset?: string
  selectedComputeAssetType?: string
  selectedComputeAssetTimeout?: string
  stepText?: string
  consumableFeedback?: string
  retry?: boolean
  datasets?: AssetSelectionAsset[]
  selectedDatasetAsset?: AssetExtended[]
  setSelectedDatasetAsset?: React.Dispatch<
    React.SetStateAction<AssetExtended[]>
  >
  tokenInfo?: TokenInfo
}

export default function Review({
  flow,
  asset,
  service,
  accessDetails,
  computeEnvs,
  hasPreviousOrder,
  hasDatatoken,
  hasPreviousOrderSelectedComputeAsset,
  hasDatatokenSelectedComputeAsset,
  isAccountIdWhitelisted,
  datasetSymbol,
  algorithmSymbol,
  providerFeesSymbol,
  algoOrderPriceAndFees,
  datasetOrderPriceAndFees,
  datasetProviderFeeProp,
  algorithmProviderFeeProp,
  datasetProviderFees,
  algorithmProviderFees,
  isBalanceSufficient,
  setIsBalanceSufficient,
  allResourceValues,
  setAllResourceValues,
  isRequestingPrice = false,
  signer,
  algorithms,
  ddoListAlgorithms = [],
  selectedAlgorithmAsset,
  setSelectedAlgorithmAsset,
  datasets,
  selectedDatasetAsset,
  setSelectedDatasetAsset,
  tokenInfo
}: ReviewProps): ReactElement {
  const isDatasetFlow = flow === 'dataset'
  const { address: accountId } = useAccount()
  const { balance } = useBalance()
  const { lookupVerifierSessionId } = useSsiWallet()
  const newCancelToken = useCancelToken()
  const { isAssetNetwork } = useAsset()
  const { privacyPolicySlug } = useUserPreferences()

  const [symbol, setSymbol] = useState('')
  const [tokenInfoState, setTokenInfoState] = useState<TokenInfo | undefined>(
    tokenInfo
  )
  const [algoOecFee, setAlgoOecFee] = useState<string>('0')
  const [datasetOecFeesBySymbol, setDatasetOecFeesBySymbol] = useState<
    Record<string, string>
  >({})
  const { setFieldValue, values, validateForm } =
    useFormikContext<FormComputeData>()
  const [verificationQueue, setVerificationQueue] = useState<
    VerificationItem[]
  >([])
  const [currentVerificationIndex, setCurrentVerificationIndex] =
    useState<number>(-1)
  const [showCredentialsCheck, setShowCredentialsCheck] =
    useState<boolean>(false)
  const [serviceIndex, setServiceIndex] = useState(0)
  const [datasetProviderFee, setDatasetProviderFee] = useState(
    datasetProviderFeeProp || null
  )
  const [algorithmProviderFee, setAlgorithmProviderFee] = useState(
    algorithmProviderFeeProp || null
  )
  const [algoOrderPriceValue, setAlgoOrderPriceValue] = useState<string>()
  const [totalPrices, setTotalPrices] = useState<TotalPriceEntry[]>([])
  const [totalPriceBreakdown, setTotalPriceBreakdown] = useState<
    TotalPriceEntry[]
  >([])
  const [insufficientBalances, setInsufficientBalances] = useState<
    Array<{ symbol: string; required: string; available: string }>
  >([])
  const [datasetProviderFeeEntries, setDatasetProviderFeeEntries] = useState<
    TotalPriceEntry[]
  >([])
  const [algorithmProviderFeeEntries, setAlgorithmProviderFeeEntries] =
    useState<TotalPriceEntry[]>([])
  const [algoLoadError, setAlgoLoadError] = useState<string>()

  const selectedEnvId =
    typeof values?.computeEnv === 'string'
      ? values?.computeEnv
      : values?.computeEnv?.id
  const freeResources = allResourceValues?.[`${selectedEnvId}_free`]
  const paidResources = allResourceValues?.[`${selectedEnvId}_paid`]
  const currentMode = values?.mode || 'free'
  const c2dPriceRaw =
    currentMode === 'paid' ? paidResources?.price : freeResources?.price
  const c2dPrice =
    c2dPriceRaw != null ? Math.round(Number(c2dPriceRaw) * 100) / 100 : 0
  const consumeMarketOrderFeeMap = useMemo(() => {
    if (!consumeMarketOrderFee) return {}
    try {
      return JSON.parse(consumeMarketOrderFee) as Record<
        string,
        Array<{ token: string; amount: string }>
      >
    } catch (error) {
      console.error('Error parsing consumeMarketOrderFee config', error)
      return {}
    }
  }, [])
  const getConsumeMarketOrderFee = useCallback(
    (chainId?: number, baseToken?: TokenInfo) => {
      if (!chainId || !baseToken?.address) return new Decimal(0)
      const chainFees = consumeMarketOrderFeeMap[chainId.toString()] || []
      const matchingFeeEntry = chainFees.find(
        (fee) => fee.token.toLowerCase() === baseToken.address.toLowerCase()
      )
      const feeAmount = matchingFeeEntry?.amount || '0'
      return new Decimal(formatUnits(feeAmount, baseToken.decimals ?? 18))
    },
    [consumeMarketOrderFeeMap]
  )

  const resolveSymbol = useCallback(
    (symbol?: string, tokenAddress?: string) =>
      symbol || (tokenAddress ? `${tokenAddress.slice(0, 6)}...` : 'UNKNOWN'),
    []
  )

  const providerFeeEntries = useMemo(() => {
    const entries = [
      ...datasetProviderFeeEntries,
      ...algorithmProviderFeeEntries
    ]
    const fallbackSymbol = resolveSymbol(
      providerFeesSymbol || symbol,
      tokenInfoState?.address
    )

    if (datasetProviderFeeEntries.length === 0 && datasetProviderFee) {
      entries.push({
        symbol: fallbackSymbol,
        value: formatUnits(datasetProviderFee, tokenInfoState?.decimals)
      })
    }

    if (algorithmProviderFeeEntries.length === 0 && algorithmProviderFee) {
      entries.push({
        symbol: fallbackSymbol,
        value: formatUnits(algorithmProviderFee, tokenInfoState?.decimals)
      })
    }

    return entries
  }, [
    datasetProviderFeeEntries,
    algorithmProviderFeeEntries,
    datasetProviderFee,
    algorithmProviderFee,
    providerFeesSymbol,
    symbol,
    tokenInfoState?.address,
    tokenInfoState?.decimals,
    resolveSymbol
  ])

  const errorMessages: string[] = []
  const formatDuration = (seconds: number): string => {
    const d = Math.floor(seconds / 86400)
    const h = Math.floor((seconds % 86400) / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    const parts: string[] = []
    if (d) parts.push(`${d}d`)
    if (h) parts.push(`${h}h`)
    if (m) parts.push(`${m}m`)
    if (s) parts.push(`${s}s`)
    return parts.join(' ') || '0s'
  }

  useEffect(() => {
    const effectiveProvider = signer?.provider
    const effectiveChainId = asset?.credentialSubject?.chainId
    if (!effectiveProvider || !effectiveChainId) return
    const fetchTokenDetails = async () => {
      const { oceanTokenAddress } = getOceanConfig(effectiveChainId)
      const tokenDetails = await getTokenInfo(
        oceanTokenAddress,
        effectiveProvider
      )
      setTokenInfoState(tokenDetails)
      setSymbol(tokenDetails.symbol || '')
    }
    fetchTokenDetails()
  }, [signer, isDatasetFlow, asset?.credentialSubject?.chainId])

  useEffect(() => {
    async function fetchPricesDatasetFlow() {
      if (!isDatasetFlow) return

      const datasetOwned =
        accessDetails?.isOwned ||
        Boolean(accessDetails?.validOrderTx) ||
        hasPreviousOrder ||
        hasDatatoken

      if (
        !asset ||
        !asset.credentialSubject?.chainId ||
        !accessDetails ||
        !signer ||
        datasetOwned
      ) {
        setDatasetOecFeesBySymbol({})
      } else {
        try {
          const datasetFixed = await getFixedBuyPrice(
            accessDetails,
            asset.credentialSubject.chainId,
            signer
          )
          const datasetSymbolLocal = resolveSymbol(
            accessDetails?.baseToken?.symbol || getBaseTokenSymbol(asset, 0),
            accessDetails?.baseToken?.address
          )
          setDatasetOecFeesBySymbol(
            datasetSymbolLocal
              ? { [datasetSymbolLocal]: datasetFixed?.oceanFeeAmount || '0' }
              : {}
          )
        } catch (e) {
          console.error('Could not fetch dataset fixed buy price:', e)
        }
      }

      const algoDetails = selectedAlgorithmAsset?.accessDetails?.[serviceIndex]
      const algoOwned =
        algoDetails?.isOwned ||
        Boolean(algoDetails?.validOrderTx) ||
        hasPreviousOrderSelectedComputeAsset ||
        hasDatatokenSelectedComputeAsset

      if (!selectedAlgorithmAsset || !algoDetails || !signer || algoOwned) {
        setAlgoOecFee('0')
        return
      }

      try {
        const algoFixed = await getFixedBuyPrice(
          algoDetails,
          selectedAlgorithmAsset.credentialSubject?.chainId,
          signer
        )
        setAlgoOecFee(algoFixed?.oceanFeeAmount || '0')
      } catch (e) {
        console.error('Could not fetch algo fixed buy price:', e)
      }
    }

    async function fetchPricesAlgorithmFlow() {
      if (isDatasetFlow) return

      if (values.withoutDataset || !selectedDatasetAsset?.length) {
        setDatasetOecFeesBySymbol({})
      } else {
        try {
          const feeEntries = await Promise.all(
            selectedDatasetAsset.map(async (dataset) => {
              const details = dataset.accessDetails?.[dataset.serviceIndex || 0]
              if (!details || !dataset.credentialSubject?.chainId || !signer)
                return null
              if (details.isOwned || details.validOrderTx) return null
              const fixed = await getFixedBuyPrice(
                details,
                dataset.credentialSubject.chainId,
                signer
              )
              const symbol = resolveSymbol(
                details.baseToken?.symbol ||
                  getBaseTokenSymbol(dataset, dataset.serviceIndex || 0),
                details.baseToken?.address
              )
              const feeValue = Number(fixed?.oceanFeeAmount) || 0
              return { symbol, feeValue }
            })
          )

          const feeTotals: Record<string, Decimal> = {}
          feeEntries.forEach((entry) => {
            if (!entry) return
            const current = feeTotals[entry.symbol] || new Decimal(0)
            feeTotals[entry.symbol] = current.add(entry.feeValue)
          })

          const mapped: Record<string, string> = {}
          Object.entries(feeTotals).forEach(([symbolKey, value]) => {
            mapped[symbolKey] = value.toString()
          })
          setDatasetOecFeesBySymbol(mapped)
        } catch (e) {
          console.error('Could not fetch dataset fixed buy price sum:', e)
        }
      }

      const algoOwned =
        accessDetails?.isOwned ||
        Boolean(accessDetails?.validOrderTx) ||
        hasPreviousOrder ||
        hasDatatoken

      if (!asset || !accessDetails || !signer || algoOwned) {
        setAlgoOecFee('0')
        return
      }

      try {
        const algoFixed = await getFixedBuyPrice(
          accessDetails,
          asset.credentialSubject?.chainId,
          signer
        )
        setAlgoOecFee(algoFixed?.oceanFeeAmount || '0')
      } catch (e) {
        console.error('Could not fetch algorithm fixed buy price:', e)
      }
    }

    fetchPricesDatasetFlow()
    fetchPricesAlgorithmFlow()
  }, [
    isDatasetFlow,
    asset,
    accessDetails,
    signer,
    selectedAlgorithmAsset,
    selectedDatasetAsset,
    serviceIndex,
    values.withoutDataset,
    hasPreviousOrder,
    hasDatatoken,
    hasPreviousOrderSelectedComputeAsset,
    hasDatatokenSelectedComputeAsset,
    resolveSymbol
  ])

  useEffect(() => {
    if (algoOrderPriceAndFees?.price) {
      setAlgoOrderPriceValue(algoOrderPriceAndFees.price)
      return
    }
    if (isDatasetFlow) {
      const algoAccessDetails =
        selectedAlgorithmAsset?.accessDetails?.[serviceIndex]
      const fallbackPrice =
        algoAccessDetails?.price ??
        selectedAlgorithmAsset?.credentialSubject?.services?.[serviceIndex]
          ?.price ??
        selectedAlgorithmAsset?.credentialSubject?.services?.[0]?.price
      if (fallbackPrice !== undefined) {
        setAlgoOrderPriceValue(String(fallbackPrice))
      }
      return
    }
    if (accessDetails?.price) {
      setAlgoOrderPriceValue(accessDetails.price)
    }
  }, [
    algoOrderPriceAndFees?.price,
    accessDetails?.price,
    isDatasetFlow,
    selectedAlgorithmAsset,
    serviceIndex
  ])

  useEffect(() => {
    if (computeEnvs?.length === 1 && !values.computeEnv) {
      setFieldValue('computeEnv', computeEnvs[0], true)
    }
    if (
      isDatasetFlow &&
      algorithms?.length === 1 &&
      !values.algorithm &&
      algorithms?.[0]?.isAccountIdWhitelisted
    ) {
      const { did } = algorithms[0]
      setFieldValue('algorithm', did, true)
    }
    if (
      !isDatasetFlow &&
      datasets?.length === 1 &&
      !values.dataset &&
      datasets?.[0]?.isAccountIdWhitelisted
    ) {
      const { did } = datasets[0]
      setFieldValue('dataset', did, true)
    }
  }, [
    computeEnvs,
    values.computeEnv,
    values.algorithm,
    values.dataset,
    algorithms,
    datasets,
    isDatasetFlow,
    setFieldValue
  ])

  useEffect(() => {
    if (!values.computeEnv || !computeEnvs) return
    const envId =
      typeof values.computeEnv === 'string'
        ? (values.computeEnv as unknown as string)
        : values.computeEnv?.id
    const selectedEnv = computeEnvs.find((env) => env.id === envId)
    if (!selectedEnv) return
    if (
      !allResourceValues[`${selectedEnv.id}_free`] &&
      !allResourceValues[`${selectedEnv.id}_paid`]
    ) {
      const cpu = selectedEnv.resources.find((r) => r.id === 'cpu')?.min || 1
      const ram =
        selectedEnv.resources.find((r) => r.id === ('ram' as string))?.min ||
        1_000_000_000
      const disk =
        selectedEnv.resources.find((r) => r.id === ('disk' as string))?.min ||
        1_000_000_000
      const jobDuration = selectedEnv.maxJobDuration || 3600
      const freeRes = {
        cpu: 0,
        ram: 0,
        disk: 0,
        jobDuration: 0,
        price: 0,
        mode: 'free'
      }
      const paidRes = {
        cpu,
        ram,
        disk,
        jobDuration,
        price: 0,
        mode: 'paid'
      }
      setAllResourceValues((prev) => ({
        ...prev,
        [`${selectedEnv.id}_free`]: freeRes,
        [`${selectedEnv.id}_paid`]: paidRes
      }))
    }
  }, [values.computeEnv, computeEnvs, allResourceValues, setAllResourceValues])

  async function getDatasetAssets(datasetsIds: string[]): Promise<{
    assets: AssetExtended[]
    services: Service[]
  }> {
    if (!Array.isArray(datasetsIds) || datasetsIds.length === 0) {
      return { assets: [], services: [] }
    }
    const newCancelTokenInstance = newCancelToken()
    const servicesCollected: Service[] = []
    const assets = await Promise.all(
      datasetsIds.map(async (item) => {
        const [datasetId, serviceId] = item.split('|')
        try {
          const fetched = await getAsset(datasetId, newCancelTokenInstance)
          if (!fetched || !fetched.credentialSubject?.services?.length)
            return null
          const serviceIndex = fetched.credentialSubject.services.findIndex(
            (svc) => svc.id === serviceId
          )
          const accessDetailsList = await Promise.all(
            fetched.credentialSubject.services.map((svc) =>
              getAccessDetails(
                fetched.credentialSubject.chainId,
                svc,
                accountId,
                newCancelTokenInstance
              )
            )
          )
          const extended: AssetExtended = {
            ...fetched,
            accessDetails: accessDetailsList,
            serviceIndex: serviceIndex !== -1 ? serviceIndex : null
          }
          if (serviceIndex !== -1) {
            servicesCollected.push(
              fetched.credentialSubject.services[serviceIndex]
            )
          }
          return extended
        } catch (error) {
          console.error(`Error processing dataset ${datasetId}:`, error)
          return null
        }
      })
    )
    return {
      assets: assets.filter(Boolean) as AssetExtended[],
      services: servicesCollected
    }
  }

  useEffect(() => {
    if (isDatasetFlow) return
    if (values.withoutDataset || !values.dataset) return
    async function fetchDatasetAssetsExtended() {
      const { assets } = await getDatasetAssets(values.dataset as string[])
      setSelectedDatasetAsset && setSelectedDatasetAsset(assets)
    }
    fetchDatasetAssetsExtended()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.dataset, values.withoutDataset, isDatasetFlow])

  useEffect(() => {
    const queue: VerificationItem[] = []
    if (isDatasetFlow) {
      if (asset && service) {
        const sessionId = lookupVerifierSessionId?.(asset.id, service.id)
        const isVerified = Boolean(sessionId)
        const rawPrice =
          accessDetails?.validOrderTx && accessDetails.validOrderTx !== ''
            ? '0'
            : accessDetails.price
        queue.push({
          id: asset.id,
          type: 'dataset',
          asset,
          service,
          status: isVerified ? ('verified' as const) : ('unverified' as const),
          index: 0,
          price: rawPrice,
          duration: formatDuration(service.timeout || 0),
          name: service.name,
          symbol: resolveSymbol(
            accessDetails?.baseToken?.symbol ||
              getBaseTokenSymbol(asset, 0) ||
              datasetSymbol ||
              tokenInfoState?.symbol,
            accessDetails?.baseToken?.address
          )
        })
      }

      const algoServices: Service[] | undefined =
        (selectedAlgorithmAsset as AssetExtended | undefined)?.credentialSubject
          ?.services ||
        ((selectedAlgorithmAsset as unknown as { services?: Service[] })
          ?.services ??
          undefined)
      const algoService = algoServices?.[serviceIndex] || algoServices?.[0]
      if (selectedAlgorithmAsset && algoService) {
        const sessionId = lookupVerifierSessionId?.(
          selectedAlgorithmAsset.id,
          algoService?.id
        )
        const isVerified = Boolean(sessionId)
        const details = selectedAlgorithmAsset?.accessDetails?.[serviceIndex]
        const rawPrice =
          details?.validOrderTx || details?.price
            ? details?.validOrderTx
              ? '0'
              : details?.price || '0'
            : algoService?.price || '0'
        queue.push({
          id: selectedAlgorithmAsset.id,
          type: 'algorithm',
          asset: selectedAlgorithmAsset,
          service: algoService,
          status: isVerified ? ('verified' as const) : ('unverified' as const),
          index: queue.length,
          price: rawPrice,
          duration: '1 day',
          name:
            selectedAlgorithmAsset.credentialSubject?.services?.[serviceIndex]
              ?.name || 'Algorithm',
          symbol: resolveSymbol(
            selectedAlgorithmAsset?.accessDetails?.[serviceIndex]?.baseToken
              ?.symbol ||
              getBaseTokenSymbol(selectedAlgorithmAsset, serviceIndex) ||
              algorithmSymbol ||
              tokenInfoState?.symbol,
            selectedAlgorithmAsset?.accessDetails?.[serviceIndex]?.baseToken
              ?.address
          )
        })
      }
    } else {
      if (!values.withoutDataset) {
        selectedDatasetAsset?.forEach((ds, index) => {
          const dsService =
            ds.credentialSubject?.services?.[ds.serviceIndex || 0]
          const sessionId = lookupVerifierSessionId?.(ds.id, dsService?.id)
          const isVerified = Boolean(sessionId)
          const details = ds.accessDetails?.[ds.serviceIndex || 0]
          const rawPrice =
            details?.validOrderTx && details.validOrderTx !== ''
              ? '0'
              : details?.price || '0'
          queue.push({
            id: ds.id,
            type: 'dataset',
            asset: ds,
            service: dsService,
            status: isVerified
              ? ('verified' as const)
              : ('unverified' as const),
            index,
            price: rawPrice,
            duration: '1 day',
            name:
              ds.credentialSubject?.services?.[ds.serviceIndex || 0]?.name ||
              `Dataset ${queue.length + 1}`,
            symbol: resolveSymbol(
              details?.baseToken?.symbol ||
                getBaseTokenSymbol(ds, ds.serviceIndex || 0) ||
                datasetSymbol ||
                tokenInfoState?.symbol,
              details?.baseToken?.address
            )
          })
        })
      }
      if (service && asset) {
        const sessionId = lookupVerifierSessionId?.(asset?.id, service.id)
        const isVerified = Boolean(sessionId)
        const rawPrice = asset.credentialSubject.metadata.algorithm
          ? accessDetails?.validOrderTx
            ? '0'
            : accessDetails.price
          : asset.accessDetails?.[0].validOrderTx
          ? '0'
          : asset.accessDetails?.[0].price
        queue.push({
          id: asset.id,
          type: 'algorithm',
          asset,
          service,
          status: isVerified ? ('verified' as const) : ('unverified' as const),
          index: queue.length,
          price: rawPrice,
          duration: formatDuration(service.timeout || 0),
          name: service.name,
          symbol: resolveSymbol(
            accessDetails?.baseToken?.symbol ||
              getBaseTokenSymbol(asset, 0) ||
              algorithmSymbol ||
              tokenInfoState?.symbol,
            accessDetails?.baseToken?.address
          )
        })
      }
    }
    setVerificationQueue(queue)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isDatasetFlow,
    asset,
    service,
    accessDetails,
    selectedAlgorithmAsset,
    selectedDatasetAsset,
    values.withoutDataset,
    serviceIndex
  ])

  useEffect(() => {
    const checkExpiration = () => {
      setVerificationQueue((prev) =>
        prev.map((item) => {
          const needsSsi =
            requiresSsi(item.asset?.credentialSubject?.credentials) ||
            requiresSsi(item.service?.credentials)
          if (
            needsSsi &&
            item.status === 'verified' &&
            item.asset?.id &&
            item.service?.id
          ) {
            const credentialKey = `credential_${item.asset.id}_${item.service.id}`
            const storedTimestamp =
              typeof window !== 'undefined' && window.localStorage
                ? window.localStorage.getItem(credentialKey)
                : null
            if (storedTimestamp) {
              const timestamp = parseInt(storedTimestamp, 10)
              const now = Date.now()
              const isExpired = now - timestamp > 5 * 60 * 1000
              if (isExpired) {
                return { ...item, status: 'expired' as const }
              }
            } else {
              return { ...item, status: 'failed' as const }
            }
          }
          return item
        })
      )
    }
    checkExpiration()
    const interval = setInterval(checkExpiration, 10000)
    return () => clearInterval(interval)
  }, [])

  const startVerification = (index: number) => {
    const hasExpiredCredentials = verificationQueue.some(
      (item) => item.status === 'failed' || item.status === 'expired'
    )
    if (hasExpiredCredentials) {
      const expiredIndices = verificationQueue
        .map((item, i) => ({ item, index: i }))
        .filter(
          ({ item }) => item.status === 'failed' || item.status === 'expired'
        )
        .map(({ index }) => index)
      const firstExpiredIndex = expiredIndices[0]
      if (firstExpiredIndex !== undefined) {
        setVerificationQueue((prev) =>
          prev.map((item, i) =>
            i === firstExpiredIndex
              ? { ...item, status: 'checking' as const }
              : item
          )
        )
        setCurrentVerificationIndex(firstExpiredIndex)
        setShowCredentialsCheck(true)
      }
    } else {
      setVerificationQueue((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, status: 'checking' as const } : item
        )
      )
      setCurrentVerificationIndex(index)
      setShowCredentialsCheck(true)
    }
  }

  const handleVerificationComplete = () => {
    const currentItem = verificationQueue[currentVerificationIndex]
    if (currentItem) {
      const credentialKey = `credential_${currentItem.asset.id}_${currentItem.service.id}`
      const timestamp = Date.now().toString()
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(credentialKey, timestamp)
        window.dispatchEvent(
          new CustomEvent('credentialUpdated', {
            detail: { credentialKey }
          })
        )
      }
    }
    setVerificationQueue((prev) => {
      const updatedQueue = prev.map((item, i) =>
        i === currentVerificationIndex
          ? { ...item, status: 'verified' as const }
          : item
      )
      const hasExpiredCredentials = updatedQueue.some(
        (item) =>
          item.status === 'failed' ||
          (item.status === 'expired' &&
            item.asset?.id &&
            item.service?.id &&
            typeof window !== 'undefined' &&
            window.localStorage &&
            window.localStorage.getItem(
              `credential_${item.asset.id}_${item.service.id}`
            ) !== null)
      )
      let nextIndex = -1
      if (hasExpiredCredentials) {
        nextIndex = updatedQueue.findIndex(
          (item, index) =>
            (index > currentVerificationIndex && item.status === 'failed') ||
            (item.status === 'expired' &&
              item.asset?.id &&
              item.service?.id &&
              typeof window !== 'undefined' &&
              window.localStorage &&
              window.localStorage.getItem(
                `credential_${item.asset.id}_${item.service.id}`
              ) !== null)
        )
      } else {
        nextIndex = updatedQueue.findIndex(
          (item, index) =>
            index > currentVerificationIndex && item.status !== 'verified'
        )
      }
      if (nextIndex !== -1) {
        setTimeout(() => startVerification(nextIndex), 300)
      }
      return updatedQueue
    })
    setShowCredentialsCheck(false)
    setCurrentVerificationIndex(-1)
  }

  const handleVerificationError = () => {
    setVerificationQueue((prev) =>
      prev.map((item, i) =>
        i === currentVerificationIndex
          ? { ...item, status: 'failed' as const }
          : item
      )
    )
    setShowCredentialsCheck(false)
    setCurrentVerificationIndex(-1)
  }

  useEffect(() => {
    const totalsMap = new Map<string, Decimal>()
    const order: string[] = []
    const addAmount = (symbol: string | undefined, value: Decimal.Value) => {
      if (!symbol) return
      const amount = new Decimal(value || 0)
      if (amount.eq(0)) return
      if (!totalsMap.has(symbol)) order.push(symbol)
      totalsMap.set(
        symbol,
        (totalsMap.get(symbol) || new Decimal(0)).add(amount)
      )
    }

    const providerFeeSymbol = resolveSymbol(
      providerFeesSymbol || symbol,
      tokenInfoState?.address
    )

    if (isDatasetFlow) {
      if (
        !asset?.accessDetails ||
        !selectedAlgorithmAsset?.accessDetails?.length
      )
        return
      const details = selectedAlgorithmAsset.accessDetails[serviceIndex]
      const datasetToken = resolveSymbol(
        accessDetails?.baseToken?.symbol ||
          getBaseTokenSymbol(asset, 0) ||
          datasetSymbol,
        accessDetails?.baseToken?.address
      )
      const datasetOwned =
        accessDetails?.isOwned ||
        Boolean(accessDetails?.validOrderTx) ||
        hasPreviousOrder ||
        hasDatatoken
      const datasetPriceValue =
        datasetOrderPriceAndFees?.price || accessDetails?.price || '0'
      const datasetPrice = datasetOwned ? '0' : datasetPriceValue
      const datasetFee = datasetOwned
        ? new Decimal(0)
        : getConsumeMarketOrderFee(
            asset?.credentialSubject?.chainId,
            accessDetails?.baseToken
          )
      setDatasetProviderFee(datasetProviderFeeProp || datasetProviderFee)

      const algoToken = resolveSymbol(
        details?.baseToken?.symbol ||
          getBaseTokenSymbol(selectedAlgorithmAsset, serviceIndex) ||
          algorithmSymbol,
        details?.baseToken?.address
      )
      const algoOwned =
        details?.isOwned ||
        Boolean(details?.validOrderTx) ||
        hasPreviousOrderSelectedComputeAsset ||
        hasDatatokenSelectedComputeAsset
      const algoPriceValue = algoOrderPriceValue || details?.price || '0'
      const algoPrice = algoOwned ? '0' : algoPriceValue
      const algoFee = algoOwned
        ? new Decimal(0)
        : getConsumeMarketOrderFee(
            selectedAlgorithmAsset?.credentialSubject?.chainId,
            details?.baseToken
          )

      addAmount(datasetToken, new Decimal(datasetPrice).add(datasetFee))
      addAmount(algoToken, new Decimal(algoPrice).add(algoFee))
    } else {
      if (!asset?.accessDetails) return
      const algoToken = resolveSymbol(
        accessDetails?.baseToken?.symbol ||
          getBaseTokenSymbol(asset, 0) ||
          algorithmSymbol,
        accessDetails?.baseToken?.address
      )
      const algoOwned =
        accessDetails?.isOwned ||
        Boolean(accessDetails?.validOrderTx) ||
        hasPreviousOrder ||
        hasDatatoken
      const rawAlgoPrice = algoOwned
        ? '0'
        : algoOrderPriceValue || accessDetails?.price || '0'
      const algoFee = algoOwned
        ? new Decimal(0)
        : getConsumeMarketOrderFee(
            asset?.credentialSubject?.chainId,
            accessDetails?.baseToken
          )
      addAmount(algoToken, new Decimal(rawAlgoPrice).add(algoFee))

      if (!values.withoutDataset && Array.isArray(selectedDatasetAsset)) {
        selectedDatasetAsset.forEach((dataset) => {
          const index = dataset.serviceIndex || 0
          const details = dataset.accessDetails?.[index]
          if (!details) return
          const datasetOwned = details.isOwned || Boolean(details.validOrderTx)
          const token = resolveSymbol(
            details.baseToken?.symbol ||
              getBaseTokenSymbol(dataset, index) ||
              datasetSymbol,
            details.baseToken?.address
          )
          const rawPrice = datasetOwned ? '0' : details?.price || '0'
          const fee = datasetOwned
            ? new Decimal(0)
            : getConsumeMarketOrderFee(
                dataset.credentialSubject?.chainId,
                details?.baseToken
              )
          addAmount(token, new Decimal(rawPrice).add(fee))
        })
      }
    }

    if (c2dPrice) {
      addAmount(providerFeeSymbol, c2dPrice.toString())
    }

    const totals = order.map((symbolKey) => {
      const totalValue = totalsMap.get(symbolKey)
      return {
        symbol: symbolKey,
        value: totalValue
          ? totalValue.toDecimalPlaces(MAX_DECIMALS).toString()
          : '0'
      }
    })
    setTotalPrices(totals)
  }, [
    isDatasetFlow,
    asset,
    accessDetails,
    selectedAlgorithmAsset,
    selectedDatasetAsset,
    serviceIndex,
    hasPreviousOrder,
    hasDatatoken,
    hasPreviousOrderSelectedComputeAsset,
    hasDatatokenSelectedComputeAsset,
    algoOrderPriceAndFees?.price,
    algoOrderPriceValue,
    datasetOrderPriceAndFees?.price,
    datasetProviderFeeProp,
    datasetProviderFee,
    algorithmSymbol,
    datasetSymbol,
    providerFeesSymbol,
    c2dPrice,
    symbol,
    tokenInfoState?.address,
    values.withoutDataset,
    getConsumeMarketOrderFee,
    resolveSymbol
  ])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (datasetProviderFeeProp) setDatasetProviderFee(datasetProviderFeeProp)
  }, [datasetProviderFeeProp])

  useEffect(() => {
    if (algorithmProviderFeeProp)
      setAlgorithmProviderFee(algorithmProviderFeeProp)
  }, [algorithmProviderFeeProp])

  useEffect(() => {
    const provider = signer?.provider
    if (!provider) {
      setDatasetProviderFeeEntries([])
      setAlgorithmProviderFeeEntries([])
      return
    }

    let cancelled = false

    const buildProviderFeeEntries = async (
      fees: ProviderFees[] | undefined
    ): Promise<TotalPriceEntry[]> => {
      if (!fees || fees.length === 0) return []
      const totals = new Map<string, Decimal>()
      fees.forEach((fee) => {
        const token = fee?.providerFeeToken?.toLowerCase()
        if (!token) return
        const amount = new Decimal(fee.providerFeeAmount || 0)
        if (amount.eq(0)) return
        totals.set(token, (totals.get(token) || new Decimal(0)).add(amount))
      })

      const tokens = Array.from(totals.keys())
      if (tokens.length === 0) return []

      const tokenInfos = await Promise.all(
        tokens.map((token) => getTokenInfo(token, provider))
      )

      return tokens.map((token, index) => {
        const info = tokenInfos[index]
        const decimals = info?.decimals ?? 18
        const amountWei = totals.get(token)
        const value = amountWei
          ? formatUnits(amountWei.toFixed(0), decimals)
          : '0'
        return {
          symbol: resolveSymbol(info?.symbol, token),
          value
        }
      })
    }

    async function loadProviderFees() {
      const datasetEntries = await buildProviderFeeEntries(datasetProviderFees)
      const algorithmEntries = await buildProviderFeeEntries(
        algorithmProviderFees ? [algorithmProviderFees] : []
      )
      if (cancelled) return
      setDatasetProviderFeeEntries(datasetEntries)
      setAlgorithmProviderFeeEntries(algorithmEntries)
    }

    loadProviderFees()

    return () => {
      cancelled = true
    }
  }, [
    datasetProviderFees,
    algorithmProviderFees,
    signer?.provider,
    resolveSymbol
  ])

  useEffect(() => {
    const filteredPriceChecks = totalPriceBreakdown.filter(
      (price) => price.value !== '0' && price.symbol
    )
    let sufficient = true
    const missingBalances: Array<{
      symbol: string
      required: string
      available: string
    }> = []
    for (const price of filteredPriceChecks) {
      const baseTokenBalance =
        getTokenBalanceFromSymbol(balance, price.symbol) || '0'
      if (!compareAsBN(baseTokenBalance, price.value)) {
        sufficient = false
        if (!missingBalances.some((entry) => entry.symbol === price.symbol)) {
          missingBalances.push({
            symbol: price.symbol,
            required: new Decimal(price.value || 0)
              .toDecimalPlaces(MAX_DECIMALS)
              .toString(),
            available: new Decimal(baseTokenBalance || 0)
              .toDecimalPlaces(MAX_DECIMALS)
              .toString()
          })
        }
      }
    }
    setInsufficientBalances(missingBalances)
    setIsBalanceSufficient(sufficient)
  }, [balance, totalPriceBreakdown, setIsBalanceSufficient])

  useEffect(() => {
    const allVerified =
      verificationQueue.length > 0 &&
      verificationQueue.every((item) => item.status === 'verified')
    setFieldValue('credentialsVerified', allVerified, false)
    validateForm()
  }, [verificationQueue, setFieldValue, validateForm])

  useEffect(() => {
    const priceEntries = [...totalPrices]
    const c2dSymbolResolved = resolveSymbol(
      providerFeesSymbol || symbol,
      tokenInfoState?.address
    )
    if (c2dPrice && !priceEntries.some((p) => p.symbol === c2dSymbolResolved)) {
      priceEntries.push({
        value: c2dPrice.toString(),
        symbol: c2dSymbolResolved
      })
    }

    const totalsMap = new Map<string, Decimal>()
    const order: string[] = []

    const addAmount = (symbol: string | undefined, value: Decimal.Value) => {
      if (!symbol) return
      const amount = new Decimal(value || 0)
      if (!totalsMap.has(symbol)) {
        if (amount.eq(0)) return
        totalsMap.set(symbol, amount)
        order.push(symbol)
        return
      }
      totalsMap.set(symbol, totalsMap.get(symbol).add(amount))
    }

    priceEntries.forEach((entry) => addAmount(entry.symbol, entry.value || 0))

    providerFeeEntries.forEach((entry) =>
      addAmount(entry.symbol, entry.value || 0)
    )

    Object.entries(datasetOecFeesBySymbol).forEach(([symbolKey, value]) => {
      addAmount(symbolKey, value || 0)
    })

    const algoBaseSymbol = isDatasetFlow
      ? resolveSymbol(
          selectedAlgorithmAsset?.accessDetails?.[serviceIndex]?.baseToken
            ?.symbol ||
            getBaseTokenSymbol(selectedAlgorithmAsset, serviceIndex) ||
            algorithmSymbol,
          selectedAlgorithmAsset?.accessDetails?.[serviceIndex]?.baseToken
            ?.address
        )
      : resolveSymbol(
          accessDetails?.baseToken?.symbol ||
            getBaseTokenSymbol(asset, 0) ||
            algorithmSymbol,
          accessDetails?.baseToken?.address
        )
    addAmount(algoBaseSymbol, algoOecFee || 0)

    const totals = order.map((symbolKey) => {
      const totalValue = totalsMap.get(symbolKey)
      return {
        symbol: symbolKey,
        value: totalValue
          ? totalValue.toDecimalPlaces(MAX_DECIMALS).toString()
          : '0'
      }
    })

    setTotalPriceBreakdown(totals.filter((item) => item?.value))
  }, [
    totalPrices,
    providerFeeEntries,
    datasetOecFeesBySymbol,
    algoOecFee,
    datasetSymbol,
    algorithmSymbol,
    providerFeesSymbol,
    c2dPrice,
    symbol,
    asset,
    accessDetails,
    selectedAlgorithmAsset,
    serviceIndex,
    isDatasetFlow,
    tokenInfoState?.address,
    resolveSymbol
  ])

  const c2dSymbol = resolveSymbol(
    providerFeesSymbol || symbol,
    tokenInfoState?.address
  )

  const computeItems = [
    {
      name: 'C2D RESOURCES',
      value: values.jobPrice || '0',
      duration: formatDuration(
        currentMode === 'paid'
          ? (paidResources?.jobDuration || 0) * 60
          : (freeResources?.jobDuration || 0) * 60
      )
    }
  ]

  const escrowFunds = [
    {
      name: 'AMOUNT AVAILABLE IN THE ESCROW ACCOUNT',
      value: Number(values.escrowFunds).toFixed(3) || '0'
    }
  ]

  const amountDeposit = [
    {
      name: 'AMOUNT TO DEPOSIT IN THE ESCROW ACCOUNT',
      value: c2dPrice ? c2dPrice.toString() : '0'
    }
  ]

  const displaySymbol =
    totalPriceBreakdown.length > 0
      ? totalPriceBreakdown
          .map((price) => price.symbol)
          .filter(Boolean)
          .join(' & ')
      : resolveSymbol(
          providerFeesSymbol || datasetSymbol || algorithmSymbol || symbol,
          tokenInfoState?.address
        )

  const totalPricesToDisplay = totalPriceBreakdown.filter(
    (price) => price.value !== '0' && price.symbol
  )

  type FeeEntry = { name: string; value: string; symbol?: string }
  type FeeDisplayEntry = FeeEntry & {
    displayValue?: string
    valueParts?: Array<{ value: string; symbol: string }>
  }
  const formatFeeValue = (value: string | number) => Number(value).toFixed(3)
  const mergeFeeRows = (fees: FeeEntry[]): FeeDisplayEntry[] => {
    const grouped = new Map<string, FeeEntry[]>()
    fees.forEach((fee) => {
      const existing = grouped.get(fee.name)
      if (existing) existing.push(fee)
      else grouped.set(fee.name, [fee])
    })

    return Array.from(grouped.entries()).map(([name, entries]) => {
      if (entries.length === 1) return entries[0]
      const valueParts = entries.map((entry) => ({
        value: formatFeeValue(entry.value),
        symbol: entry.symbol || symbol
      }))
      return { ...entries[0], name, valueParts, symbol: '' }
    })
  }

  const fallbackProviderSymbol = resolveSymbol(
    providerFeesSymbol || symbol,
    tokenInfoState?.address
  )
  const datasetProviderFeesList =
    datasetProviderFeeEntries.length > 0
      ? datasetProviderFeeEntries.map((fee) => ({
          name: 'PROVIDER FEE DATASET',
          value: fee.value,
          symbol: fee.symbol
        }))
      : datasetProviderFee
      ? [
          {
            name: 'PROVIDER FEE DATASET',
            value: formatUnits(datasetProviderFee, tokenInfoState?.decimals),
            symbol: fallbackProviderSymbol
          }
        ]
      : []
  const algorithmProviderFeesList =
    algorithmProviderFeeEntries.length > 0
      ? algorithmProviderFeeEntries.map((fee) => ({
          name: 'PROVIDER FEE ALGORITHM',
          value: fee.value,
          symbol: fee.symbol
        }))
      : algorithmProviderFee
      ? [
          {
            name: 'PROVIDER FEE ALGORITHM',
            value: formatUnits(algorithmProviderFee, tokenInfoState?.decimals),
            symbol: fallbackProviderSymbol
          }
        ]
      : []

  const datasetMarketFeeEntries = (() => {
    if (isDatasetFlow) {
      const datasetToken = resolveSymbol(
        accessDetails?.baseToken?.symbol ||
          getBaseTokenSymbol(asset, 0) ||
          datasetSymbol,
        accessDetails?.baseToken?.address
      )
      const datasetOwned =
        accessDetails?.isOwned ||
        Boolean(accessDetails?.validOrderTx) ||
        hasPreviousOrder ||
        hasDatatoken
      const feeValue = datasetOwned
        ? new Decimal(0)
        : getConsumeMarketOrderFee(
            asset?.credentialSubject?.chainId,
            accessDetails?.baseToken
          )
      return datasetToken
        ? [
            {
              name: 'MARKETPLACE ORDER FEE DATASET',
              value: feeValue.toDecimalPlaces(MAX_DECIMALS).toString(),
              symbol: datasetToken
            }
          ]
        : []
    }

    if (values.withoutDataset) return []

    const totals: Record<string, Decimal> = {}
    selectedDatasetAsset?.forEach((ds) => {
      const idx = ds.serviceIndex || 0
      const details = ds.accessDetails?.[idx]
      if (!details) return
      const datasetOwned = details.isOwned || Boolean(details.validOrderTx)
      if (datasetOwned) return
      const token = resolveSymbol(
        details.baseToken?.symbol ||
          getBaseTokenSymbol(ds, idx) ||
          datasetSymbol,
        details.baseToken?.address
      )
      const feeValue = getConsumeMarketOrderFee(
        ds.credentialSubject?.chainId,
        details.baseToken
      )
      totals[token] = (totals[token] || new Decimal(0)).add(feeValue)
    })

    return Object.entries(totals).map(([symbolKey, value]) => ({
      name: 'MARKETPLACE ORDER FEE DATASET',
      value: value.toDecimalPlaces(MAX_DECIMALS).toString(),
      symbol: symbolKey
    }))
  })()

  const datasetOecFeeEntries = Object.entries(datasetOecFeesBySymbol).map(
    ([symbolKey, value]) => ({
      name: 'OEC FEE DATASET',
      value,
      symbol: symbolKey
    })
  )

  const marketFeesBase = isDatasetFlow
    ? [
        ...datasetMarketFeeEntries,
        {
          name: `MARKETPLACE ORDER FEE ALGORITHM`,
          value: (() => {
            const algoAccessDetails =
              selectedAlgorithmAsset?.accessDetails?.[serviceIndex]
            const algoOwned =
              algoAccessDetails?.isOwned ||
              Boolean(algoAccessDetails?.validOrderTx) ||
              hasPreviousOrderSelectedComputeAsset ||
              hasDatatokenSelectedComputeAsset
            const feeValue = algoOwned
              ? new Decimal(0)
              : getConsumeMarketOrderFee(
                  selectedAlgorithmAsset?.credentialSubject?.chainId,
                  algoAccessDetails?.baseToken
                )
            return feeValue.toDecimalPlaces(MAX_DECIMALS).toString()
          })(),
          symbol: resolveSymbol(
            selectedAlgorithmAsset?.accessDetails?.[serviceIndex]?.baseToken
              ?.symbol ||
              getBaseTokenSymbol(selectedAlgorithmAsset, serviceIndex) ||
              algorithmSymbol,
            selectedAlgorithmAsset?.accessDetails?.[serviceIndex]?.baseToken
              ?.address
          )
        },
        ...datasetOecFeeEntries,
        {
          name: `OEC FEE ALGORITHM`,
          value: selectedAlgorithmAsset?.accessDetails?.[serviceIndex]?.isOwned
            ? '0'
            : algoOecFee.toString(),
          symbol: resolveSymbol(
            selectedAlgorithmAsset?.accessDetails?.[serviceIndex]?.baseToken
              ?.symbol ||
              getBaseTokenSymbol(selectedAlgorithmAsset, serviceIndex) ||
              algorithmSymbol,
            selectedAlgorithmAsset?.accessDetails?.[serviceIndex]?.baseToken
              ?.address
          )
        }
      ]
    : [
        ...datasetMarketFeeEntries,
        {
          name: `MARKETPLACE ORDER FEE ALGORITHM`,
          value: (() => {
            const algoOwned =
              accessDetails?.isOwned ||
              Boolean(accessDetails?.validOrderTx) ||
              hasPreviousOrder ||
              hasDatatoken
            const feeValue = algoOwned
              ? new Decimal(0)
              : getConsumeMarketOrderFee(
                  asset?.credentialSubject?.chainId,
                  accessDetails?.baseToken
                )
            return feeValue.toDecimalPlaces(MAX_DECIMALS).toString()
          })(),
          symbol: resolveSymbol(
            accessDetails?.baseToken?.symbol ||
              getBaseTokenSymbol(asset, 0) ||
              algorithmSymbol,
            accessDetails?.baseToken?.address
          )
        },
        ...datasetOecFeeEntries,
        {
          name: `OEC FEE ALGORITHM`,
          value: algoOecFee.toString(),
          symbol: resolveSymbol(
            accessDetails?.baseToken?.symbol ||
              getBaseTokenSymbol(asset, 0) ||
              algorithmSymbol,
            accessDetails?.baseToken?.address
          )
        }
      ]

  const marketFees =
    !isDatasetFlow && values.withoutDataset
      ? marketFeesBase.filter((fee) => !fee.name.includes('DATASET'))
      : marketFeesBase

  const mergedMarketFees = mergeFeeRows(marketFees)
  const mergedDatasetProviderFees = mergeFeeRows(datasetProviderFeesList)
  const mergedAlgorithmProviderFees = mergeFeeRows(algorithmProviderFeesList)

  if (!isBalanceSufficient) {
    if (insufficientBalances.length > 0) {
      insufficientBalances.forEach(({ symbol, required, available }) => {
        errorMessages.push(
          `You don't have enough ${symbol} to make this purchase (required ${required}, available ${available}).`
        )
      })
    } else {
      errorMessages.push(
        `You don't have enough ${displaySymbol} to make this purchase.`
      )
    }
  }
  if (!isAssetNetwork) {
    errorMessages.push('This asset is not available on the selected network.')
  }
  if (
    !isDatasetFlow &&
    selectedDatasetAsset?.length &&
    selectedDatasetAsset.some(
      (d) =>
        d.accessDetails &&
        d.accessDetails[d.serviceIndex || 0] &&
        !d.accessDetails[d.serviceIndex || 0].isPurchasable
    )
  ) {
    errorMessages.push('One or more selected datasets are not purchasable.')
  }
  if (
    selectedAlgorithmAsset?.accessDetails &&
    selectedAlgorithmAsset.accessDetails[serviceIndex] &&
    !selectedAlgorithmAsset.accessDetails[serviceIndex].isPurchasable
  ) {
    errorMessages.push('The selected algorithm asset is not purchasable.')
  }
  if (!isAccountIdWhitelisted) {
    errorMessages.push(
      'Your account is not whitelisted to purchase this asset.'
    )
  }

  const currentVerificationItem = verificationQueue[currentVerificationIndex]
  const assetRows = verificationQueue
  const isLoadingAssets = isDatasetFlow
    ? !selectedAlgorithmAsset
    : !values.withoutDataset &&
      (!selectedDatasetAsset || selectedDatasetAsset.length === 0)

  function getAlgorithmAsset(algo: string): {
    algorithmAsset: AssetExtended | null
    serviceIndexAlgo: number | null
  } {
    let algorithmId = algo
    let serviceId = ''
    try {
      const parsed = JSON.parse(algo)
      algorithmId = parsed?.algoDid || algo
      serviceId = parsed?.serviceId || ''
    } catch {
      algorithmId = algo
    }

    let algorithmAsset: AssetExtended | null = null
    let serviceIndexAlgo: number | null = null

    ddoListAlgorithms?.forEach((ddo: Asset) => {
      if (ddo.id === algorithmId) {
        algorithmAsset = ddo as AssetExtended
        if (serviceId && ddo.credentialSubject?.services) {
          const idx = ddo.credentialSubject.services.findIndex(
            (svc: Service) => svc.id === serviceId
          )
          serviceIndexAlgo = idx !== -1 ? idx : null
        }
      }
    })

    return { algorithmAsset, serviceIndexAlgo }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isDatasetFlow) return
    if (selectedAlgorithmAsset) return

    const algoId = values.algorithm as string | undefined
    const fallbackAlgo = values.algorithms as AssetExtended | undefined

    if (!algoId && fallbackAlgo) {
      if (fallbackAlgo.serviceIndex !== undefined) {
        setServiceIndex(fallbackAlgo.serviceIndex)
      }
      setSelectedAlgorithmAsset?.(fallbackAlgo)
      setAlgoLoadError(undefined)
      return
    }

    if (!algoId) {
      setAlgoLoadError('Algorithm selection missing for review.')
      return
    }

    const { algorithmAsset, serviceIndexAlgo } = getAlgorithmAsset(algoId)
    if (!algorithmAsset) {
      setAlgoLoadError('Algorithm asset not found for review.')
      return
    }

    async function fetchAlgorithmAssetExtended() {
      try {
        const algoAccessDetails = await Promise.all(
          algorithmAsset.credentialSubject?.services?.map((svc: Service) =>
            getAccessDetails(
              algorithmAsset.credentialSubject?.chainId,
              svc,
              accountId,
              newCancelToken()
            )
          ) || []
        )

        if (serviceIndexAlgo !== null) {
          setServiceIndex(serviceIndexAlgo)
        }

        const extendedAlgo: AssetExtended = {
          ...algorithmAsset,
          accessDetails: algoAccessDetails,
          serviceIndex: serviceIndexAlgo ?? undefined
        }
        setSelectedAlgorithmAsset?.(extendedAlgo)
        setAlgoLoadError(undefined)
      } catch (e) {
        console.error('Could not fetch algorithm asset in review:', e)
      }
    }
    fetchAlgorithmAssetExtended()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isDatasetFlow,
    selectedAlgorithmAsset,
    values.algorithm,
    values.algorithms,
    ddoListAlgorithms,
    accountId,
    newCancelToken,
    setSelectedAlgorithmAsset
  ])

  return (
    <div className={styles.container}>
      <div className={styles.titleContainer}>
        <StepTitle title="Review and Purchase" />
      </div>

      <div className={styles.contentContainer}>
        <div className={styles.pricingBreakdown}>
          <div className={styles.assetSection}>
            <h3 className={styles.assetHeading}>Assets</h3>
            <div className={styles.assetListBox}>
              {algoLoadError ? (
                <div className={styles.loaderWrap}>
                  <div className={styles.errorMessage}>{algoLoadError}</div>
                </div>
              ) : isLoadingAssets ? (
                <div className={styles.loaderWrap}>
                  <Loader message="Loading assets..." noMargin />
                </div>
              ) : (
                assetRows.map((item, i) => {
                  const hasSsiPolicy =
                    requiresSsi(item.asset?.credentialSubject?.credentials) ||
                    requiresSsi(item.service?.credentials)
                  return (
                    <PricingRow
                      key={`${item.type}-${item.id}-${i}`}
                      label={item.asset?.credentialSubject?.metadata?.name}
                      itemName={item.name}
                      value={item.price}
                      duration={item.duration}
                      actionLabel={
                        item.status === 'unverified'
                          ? 'Check Credentials'
                          : item.status === 'checking'
                          ? 'Verifying...'
                          : item.status === 'failed'
                          ? 'Retry'
                          : item.status === 'expired'
                          ? 'Check Credentials'
                          : 'Verified'
                      }
                      onAction={() => startVerification(i)}
                      actionDisabled={
                        item.status === 'checking' || item.status === 'verified'
                      }
                      isService={item.type === 'algorithm'}
                      infoMessage={
                        !hasSsiPolicy
                          ? 'No credentials required (never expires)'
                          : undefined
                      }
                      credentialStatus={item.status}
                      assetId={item.asset?.id}
                      serviceId={item.service?.id}
                      onCredentialRefresh={() => startVerification(i)}
                      symbol={item.symbol || symbol}
                      tooltip={getFeeTooltip(item.name)}
                      showStatusWithoutAction
                    />
                  )
                })
              )}
            </div>
          </div>

          <div className={styles.c2dSection}>
            <h3 className={styles.c2dHeading}>C2D Resources</h3>
            <div className={styles.c2dBox}>
              {computeItems.map((item) => (
                <PricingRow
                  key={item.name}
                  itemName={item.name}
                  value={item.value}
                  duration={item.duration}
                  symbol={c2dSymbol}
                />
              ))}
              {escrowFunds.map((item) => (
                <PricingRow
                  key={item.name}
                  itemName={item.name}
                  value={item.value}
                  valueType="escrow"
                  symbol={c2dSymbol}
                />
              ))}
              {amountDeposit.map((item) => (
                <PricingRow
                  key={item.name}
                  itemName={item.name}
                  value={item.value}
                  valueType="deposit"
                  symbol={c2dSymbol}
                />
              ))}
            </div>
          </div>

          <div className={styles.marketFeesSection}>
            <h3 className={styles.marketFeesHeading}>Fees</h3>
            <div className={styles.marketFeesBox}>
              {mergedMarketFees.map((fee) => (
                <PricingRow
                  key={fee.name}
                  itemName={fee.name}
                  value={fee.value}
                  valueParts={fee.valueParts}
                  symbol={fee.valueParts ? '' : fee.symbol || symbol}
                />
              ))}
              {!values.withoutDataset &&
                mergedDatasetProviderFees.length > 0 &&
                mergedDatasetProviderFees.map((fee) => (
                  <PricingRow
                    key={fee.name}
                    itemName={fee.name}
                    value={fee.value}
                    valueParts={fee.valueParts}
                    symbol={
                      fee.valueParts
                        ? ''
                        : fee.symbol || datasetSymbol || symbol
                    }
                  />
                ))}
              {mergedAlgorithmProviderFees.length > 0 &&
                mergedAlgorithmProviderFees.map((fee) => (
                  <PricingRow
                    key={fee.name}
                    itemName={fee.name}
                    value={fee.value}
                    valueParts={fee.valueParts}
                    symbol={
                      fee.valueParts
                        ? ''
                        : fee.symbol || algorithmSymbol || symbol
                    }
                  />
                ))}
            </div>
          </div>
        </div>

        <div className={styles.totalSection}>
          <span className={styles.totalLabel}>YOU WILL PAY</span>
          <span className={styles.totalValue}>
            {isRequestingPrice ? (
              <span className={styles.totalValueNumber}>Calculating...</span>
            ) : totalPricesToDisplay.length > 0 ? (
              <span className={styles.totalList}>
                {totalPricesToDisplay.map((price) => (
                  <span className={styles.totalListItem} key={price.symbol}>
                    <span className={styles.totalValueNumber}>
                      {new Decimal(price.value || 0)
                        .toDecimalPlaces(3, Decimal.ROUND_DOWN)
                        .toString()}
                    </span>
                    <span className={styles.totalValueSymbol}>
                      {' '}
                      {price.symbol}
                    </span>
                  </span>
                ))}
              </span>
            ) : (
              <span className={styles.totalListItem}>
                <span className={styles.totalValueNumber}>0</span>
                <span className={styles.totalValueSymbol}>
                  {' '}
                  {displaySymbol}
                </span>
              </span>
            )}
          </span>
        </div>

        <div className={styles.termsSection}>
          <FormErrorGroup
            errorFields={['termsAndConditions', 'acceptPublishingLicense']}
          >
            <Field
              component={Input}
              name="termsAndConditions"
              type="checkbox"
              options={['Terms and Conditions']}
              prefixes={['I agree to the']}
              actions={[`${privacyPolicySlug}#terms-and-conditions`]}
              disabled={false}
              hideLabel={true}
            />
            <Field
              component={Input}
              name="acceptPublishingLicense"
              type="checkbox"
              options={[
                'license terms under which each of the selected assets was made available'
              ]}
              prefixes={['I agree to the']}
              disabled={false}
              hideLabel={true}
            />
          </FormErrorGroup>
        </div>
        {errorMessages.length > 0 && (
          <div className={styles.errorMessage}>
            <ul>
              {errorMessages.map((msg, idx) => (
                <li key={idx}>{msg}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {showCredentialsCheck && currentVerificationItem && (
        <div className={styles.credentialsOverlay}>
          <div className={styles.credentialsContainer}>
            <div className={styles.credentialsHeader}>
              <h3>
                Verify{' '}
                {currentVerificationItem.type === 'dataset'
                  ? 'Dataset'
                  : 'Algorithm'}{' '}
                Credentials
              </h3>
              <button
                className={styles.closeButton}
                onClick={() => {
                  setShowCredentialsCheck(false)
                  setCurrentVerificationIndex(-1)
                  setVerificationQueue((prev) =>
                    prev.map((item, i) =>
                      i === currentVerificationIndex
                        ? { ...item, status: 'failed' as const }
                        : item
                    )
                  )
                }}
              >
                ✕ Close
              </button>
            </div>
            <CredentialDialogProvider autoStart={true}>
              {currentVerificationItem.type === 'dataset' ? (
                <AssetActionCheckCredentials
                  asset={currentVerificationItem.asset}
                  service={currentVerificationItem.service}
                  onVerified={handleVerificationComplete}
                  onError={handleVerificationError}
                />
              ) : (
                <AssetActionCheckCredentialsAlgo
                  asset={currentVerificationItem.asset}
                  service={currentVerificationItem.service}
                  onVerified={handleVerificationComplete}
                  onError={handleVerificationError}
                />
              )}
            </CredentialDialogProvider>
          </div>
        </div>
      )}
    </div>
  )
}
