import { useState, ReactElement, useEffect, useCallback } from 'react'
import {
  FileInfo,
  Datatoken,
  ProviderInstance,
  ZERO_ADDRESS,
  ComputeEnvironment,
  LoggerInstance,
  ComputeAlgorithm,
  ProviderComputeInitializeResults,
  unitsToAmount,
  ProviderFees,
  UserCustomParameters,
  EscrowContract
} from '@oceanprotocol/lib'
import { toast } from 'react-toastify'
import Price from '@shared/Price'
import FileIcon from '@shared/FileIcon'
import Alert from '@shared/atoms/Alert'
import { Formik } from 'formik'
import {
  ComputeDatasetForm,
  getComputeValidationSchema,
  getInitialValues
} from './_constants'
import FormStartComputeDataset from './FormComputeDataset'
import styles from './index.module.css'
import SuccessConfetti from '@shared/SuccessConfetti'
import { secondsToString } from '@utils/ddo'
import {
  isOrderable,
  getAlgorithmAssetSelectionList,
  getAlgorithmsForAsset,
  getComputeJobs
} from '@utils/compute'
import { AssetSelectionAsset } from '@shared/FormInput/InputElement/AssetSelection'
import AlgorithmDatasetsListForCompute from './AlgorithmDatasetsListForCompute'
import ComputeHistory from './History'
import ComputeJobs from '../../../Profile/History/ComputeJobs'
import { useCancelToken } from '@hooks/useCancelToken'
import { Decimal } from 'decimal.js'
import {
  getAvailablePrice,
  getOrderPriceAndFees
} from '@utils/accessDetailsAndPricing'
import { getComputeFeedback } from '@utils/feedback'
import {
  getComputeEnvironments,
  initializeProviderForComputeMulti
} from '@utils/provider'
import { useUserPreferences } from '@context/UserPreferences'
import { getDummySigner } from '@utils/wallet'
import WhitelistIndicator from './WhitelistIndicator'
import { parseConsumerParameterValues } from '../ConsumerParameters'
import { BigNumber, ethers, Signer } from 'ethers'
import { useAccount } from 'wagmi'
import { Service } from '../../../../@types/ddo/Service'
import { Asset, AssetPrice } from '../../../../@types/Asset'
import { AssetExtended } from '../../../../@types/AssetExtended'
import { AssetActionCheckCredentials } from '../CheckCredentials'
import { useSsiWallet } from '@context/SsiWallet'
import { checkVerifierSessionId } from '@utils/wallet/policyServer'
import appConfig from 'app.config.cjs' // here we need to work
import { ResourceType } from 'src/@types/ResourceType'
import { handleComputeOrder } from '@utils/order'
import { CredentialDialogProvider } from './CredentialDialogProvider'
import { PolicyServerInitiateComputeActionData } from 'src/@types/PolicyServer'
import FormStartComputeAlgo from './FormComputeAlgorithm'
import { getAlgorithmDatasetsForCompute } from '@utils/aquarius'
import { getOceanConfig } from '@utils/ocean'

export default function Compute({
  accountId,
  signer,
  asset,
  service,
  accessDetails,
  dtBalance,
  file,
  isAccountIdWhitelisted,
  fileIsLoading,
  consumableFeedback
}: {
  accountId: string
  signer: Signer
  asset: AssetExtended
  service: Service
  accessDetails: AccessDetails
  dtBalance: string
  file: FileInfo
  isAccountIdWhitelisted: boolean
  fileIsLoading?: boolean
  consumableFeedback?: string
}): ReactElement {
  const { address } = useAccount()
  const { chainIds } = useUserPreferences()
  const config = getOceanConfig(asset.credentialSubject.chainId)
  const { oceanTokenAddress } = config

  const newCancelToken = useCancelToken()

  const [isOrdering, setIsOrdering] = useState(false)
  const [isOrdered, setIsOrdered] = useState(false)
  const [error, setError] = useState<string>()

  const [algorithmList, setAlgorithmList] = useState<AssetSelectionAsset[]>()
  const [datasetList, setDatasetList] = useState<AssetSelectionAsset[]>()

  const [ddoAlgorithmList, setDdoAlgorithmList] = useState<Asset[]>()
  const [selectedAlgorithmAsset, setSelectedAlgorithmAsset] =
    useState<AssetExtended>()
  const [selectedDatasetAsset, setSelectedDatasetAsset] = useState<
    AssetExtended[]
  >([])
  const [hasAlgoAssetDatatoken, setHasAlgoAssetDatatoken] = useState<boolean>()
  const [algorithmDTBalance, setAlgorithmDTBalance] = useState<string>()

  const [validOrderTx, setValidOrderTx] = useState('')
  const [validAlgorithmOrderTx, setValidAlgorithmOrderTx] = useState('')

  const [isConsumablePrice, setIsConsumablePrice] = useState(true)
  const [isConsumableaAlgorithmPrice, setIsConsumableAlgorithmPrice] =
    useState(true)
  const [computeStatusText, setComputeStatusText] = useState('')
  const [computeEnvs, setComputeEnvs] = useState<ComputeEnvironment[]>()
  const [termsAndConditions, setTermsAndConditions] = useState<boolean>(false)
  const [acceptPublishingLicense, setAcceptPublishingLicense] =
    useState<boolean>(false)
  const [initializedProviderResponse, setInitializedProviderResponse] =
    useState<ProviderComputeInitializeResults>()
  const [providerFeesSymbol, setProviderFeesSymbol] = useState<string>('OCEAN')
  const [datasetOrderPriceAndFees, setDatasetOrderPriceAndFees] =
    useState<OrderPriceAndFees>()
  const [algoOrderPriceAndFees, setAlgoOrderPriceAndFees] =
    useState<OrderPriceAndFees>()
  const [isRequestingAlgoOrderPrice, setIsRequestingAlgoOrderPrice] =
    useState(false)
  const [refetchJobs, setRefetchJobs] = useState(false)
  const [isLoadingJobs, setIsLoadingJobs] = useState(false)
  const [jobs, setJobs] = useState<ComputeJobMetaData[]>([])
  const [retry, setRetry] = useState<boolean>(false)
  const {
    verifierSessionCache,
    lookupVerifierSessionId,
    lookupVerifierSessionIdSkip,
    ssiWalletCache,
    setCachedCredentials,
    clearVerifierSessionCache
  } = useSsiWallet()
  const [svcIndex, setSvcIndex] = useState(0)

  const [allResourceValues, setAllResourceValues] = useState<{
    [envId: string]: ResourceType
  }>({})

  const selectedEnvId = Object.keys(allResourceValues)[0]
  const selectedComputeEnv = computeEnvs?.find(
    (env) => env.id === selectedEnvId
  )
  const selectedResources = selectedEnvId
    ? allResourceValues[selectedEnvId]
    : undefined

  const price: AssetPrice = getAvailablePrice(accessDetails)

  const hasDatatoken = Number(dtBalance) >= 1
  const isComputeButtonDisabled =
    isOrdering === true ||
    file === null ||
    (!validOrderTx && !hasDatatoken && !isConsumablePrice) ||
    (!validAlgorithmOrderTx &&
      !hasAlgoAssetDatatoken &&
      !isConsumableaAlgorithmPrice)

  const isUnsupportedPricing = accessDetails.type === 'NOT_SUPPORTED'

  function resetCacheWallet() {
    ssiWalletCache.clearCredentials()
    setCachedCredentials(undefined)
    clearVerifierSessionCache()
  }

  useEffect(() => {
    if (selectedAlgorithmAsset) {
      setSvcIndex(selectedAlgorithmAsset?.serviceIndex)
    }
  }, [selectedAlgorithmAsset])

  async function checkAssetDTBalance(algoAsset: AssetExtended | undefined) {
    try {
      if (!algoAsset?.credentialSubject?.services[svcIndex].datatokenAddress)
        return
      const dummySigner = await getDummySigner(
        algoAsset?.credentialSubject?.chainId
      )
      const datatokenInstance = new Datatoken(
        dummySigner,
        algoAsset.credentialSubject.chainId
      )
      const dtBalance = await datatokenInstance.balance(
        algoAsset?.credentialSubject?.services[svcIndex].datatokenAddress,
        accountId || ZERO_ADDRESS // if the user is not connected, we use ZERO_ADDRESS as accountId
      )
      setAlgorithmDTBalance(new Decimal(dtBalance).toString())
      const hasAlgoDt = Number(dtBalance) >= 1
      setHasAlgoAssetDatatoken(hasAlgoDt)
    } catch (error) {
      LoggerInstance.error(error)
    }
  }
  async function setDatasetPrice(
    actualAsset: AssetExtended,
    actualService: Service,
    actualAccessDetails: AccessDetails,
    datasetProviderFees: ProviderFees
  ) {
    if (
      actualAccessDetails.addressOrId !== ZERO_ADDRESS &&
      actualAccessDetails.type !== 'free' &&
      datasetProviderFees
    ) {
      const datasetPriceAndFees = await getOrderPriceAndFees(
        actualAsset,
        actualService,
        actualAccessDetails,
        accountId || ZERO_ADDRESS,
        signer,
        datasetProviderFees
      )
      if (!datasetPriceAndFees)
        throw new Error('Error setting dataset price and fees!')

      setDatasetOrderPriceAndFees(datasetPriceAndFees)
      return datasetPriceAndFees
    }
  }

  async function initPriceAndFees(
    datasetServices?: { asset: AssetExtended; service: Service }[]
  ) {
    try {
      if (!selectedComputeEnv || !selectedComputeEnv.id || !selectedResources)
        throw new Error(`Error getting compute environment!`)

      const actualDatasetAssets: AssetExtended[] = selectedDatasetAsset.length
        ? selectedDatasetAsset
        : [asset]

      const actualAlgorithmAsset = selectedAlgorithmAsset || asset
      let actualAlgoService = service
      let actualSvcIndex = svcIndex
      let actualAlgoAccessDetails = accessDetails

      const algoServiceId =
        selectedAlgorithmAsset?.id?.split('|')[1] ||
        selectedAlgorithmAsset?.credentialSubject?.services?.[svcIndex]?.id ||
        service.id

      const algoServices = actualAlgorithmAsset.credentialSubject.services || []
      const algoIndex = algoServices.findIndex((s) => s.id === algoServiceId)
      if (algoIndex === -1) throw new Error('Algorithm serviceId not found.')

      actualAlgoService = algoServices[algoIndex]
      actualSvcIndex = algoIndex
      actualAlgoAccessDetails = actualAlgorithmAsset.accessDetails[algoIndex]

      const datasetsForProvider = datasetServices.map(({ asset, service }) => {
        const datasetIndex = asset.credentialSubject.services.findIndex(
          (s) => s.id === service.id
        )
        if (datasetIndex === -1)
          throw new Error(`ServiceId ${service.id} not found in ${asset.id}`)

        return {
          asset,
          service,
          accessDetails: asset.accessDetails[datasetIndex],
          sessionId: lookupVerifierSessionId(asset.id, service.id)
        }
      })

      const algoSessionId = lookupVerifierSessionId(
        actualAlgorithmAsset.id,
        actualAlgoService.id
      )

      const initializedProvider = await initializeProviderForComputeMulti(
        datasetsForProvider,
        actualAlgorithmAsset,
        algoSessionId,
        signer,
        selectedComputeEnv,
        selectedResources,
        actualSvcIndex
      )

      if (!initializedProvider)
        throw new Error('Error initializing provider for compute job')

      const datasetResponses = await Promise.all(
        datasetsForProvider.map(
          async ({ asset, service, accessDetails }, i) => {
            const datasetOrderPriceResponse = await setDatasetPrice(
              asset,
              service,
              accessDetails,
              initializedProvider.datasets?.[i]?.providerFee
            )
            if (selectedResources.mode === 'paid') {
              console.log(
                'Escorw address',
                initializedProvider.payment.escrowAddress
              )
              const escrow = new EscrowContract(
                ethers.utils.getAddress(
                  initializedProvider.payment.escrowAddress
                ),
                signer,
                asset.credentialSubject.chainId
              )

              const amountHuman = String(selectedResources.price) // ex. "4"
              const amountWei = ethers.utils.parseUnits(amountHuman, 18)

              const erc20 = new ethers.Contract(
                oceanTokenAddress,
                [
                  'function approve(address spender, uint256 amount) returns (bool)',
                  'function allowance(address owner, address spender) view returns (uint256)'
                ],
                signer
              )

              const owner = await signer.getAddress()
              const escrowAddress = (
                escrow.contract.target ?? escrow.contract.address
              ).toString()

              const currentAllowanceWei = await erc20.allowance(
                owner,
                escrowAddress
              )
              if (currentAllowanceWei.lt(amountWei)) {
                console.log(`Approving ${amountHuman} OCEAN to escrow...`)
                const approveTx = await erc20.approve(escrowAddress, amountWei)
                await approveTx.wait()
                console.log(`Approved ${amountHuman} OCEAN`)
              } else {
                console.log(`Skip approve: allowance >= ${amountHuman} OCEAN`)
              }

              const funds = await escrow.getUserFunds(owner, oceanTokenAddress)
              const depositedWei = ethers.BigNumber.from(funds[0] ?? '0')

              if (depositedWei.lt(amountWei)) {
                console.log(
                  `Depositing ${amountHuman} OCEAN to escrow...`,
                  amountHuman
                )
                const depositTx = await escrow.deposit(
                  oceanTokenAddress,
                  amountHuman
                )
                await depositTx.wait()
                console.log(`Deposited ${amountHuman} OCEAN`)
                console.log(
                  'Authorizing compute job...',
                  amountHuman,
                  selectedComputeEnv.consumerAddress
                )
                await escrow.authorize(
                  oceanTokenAddress,
                  selectedComputeEnv.consumerAddress,
                  initializedProvider.payment.amount.toString(),
                  selectedResources.jobDuration.toString(),
                  '10'
                )
              } else {
                console.log(
                  `Skip deposit: escrow funds >= ${amountHuman} OCEAN`
                )
              }

              // await escrow.verifyFundsForEscrowPayment(
              //   oceanTokenAddress,
              //   selectedComputeEnv.consumerAddress,
              //   await unitsToAmount(signer, oceanTokenAddress, amountToDeposit),
              //   initializedProvider.payment.amount.toString(),
              //   initializedProvider.payment.minLockSeconds.toString(),
              //   '10'
              // )
            }

            return {
              actualDatasetAsset: asset,
              actualDatasetService: service,
              actualDatasetAccessDetails: accessDetails,
              datasetOrderPriceResponse,
              initializedProvider
            }
          }
        )
      )

      setComputeStatusText(
        getComputeFeedback(
          actualAlgoAccessDetails?.baseToken?.symbol,
          actualAlgoAccessDetails?.datatoken?.symbol,
          actualAlgorithmAsset?.credentialSubject?.metadata?.type
        )[0]
      )

      setInitializedProviderResponse(initializedProvider)

      return {
        datasetResponses,
        actualAlgorithmAsset,
        actualAlgoService,
        actualAlgoAccessDetails,
        initializedProvider
      }
    } catch (error) {
      setError(error.message)
      LoggerInstance.error(`[compute] ${error.message} `)
    }
  }

  useEffect(() => {
    if (!accessDetails || !accountId || isUnsupportedPricing) return

    setIsConsumablePrice(accessDetails.isPurchasable)
    setValidOrderTx(accessDetails.validOrderTx)
  }, [accessDetails, accountId, isUnsupportedPricing])

  useEffect(() => {
    if (isUnsupportedPricing) return
    if (asset.credentialSubject?.metadata.type === 'algorithm') {
      getAlgorithmDatasetsForCompute(
        asset.id,
        service.id,
        service.serviceEndpoint,
        accountId,
        asset.credentialSubject?.chainId,
        newCancelToken()
      ).then((datasetLists) => {
        setDatasetList(datasetLists)
        if (datasetLists && datasetLists.length > 0) {
          setDatasetList(datasetLists)
        }
      })
    } else {
      getAlgorithmsForAsset(asset, service, newCancelToken()).then(
        (algorithmsAssets) => {
          setDdoAlgorithmList(algorithmsAssets)
          getAlgorithmAssetSelectionList(
            service,
            algorithmsAssets,
            accountId
          ).then((algorithmSelectionList) => {
            setAlgorithmList(algorithmSelectionList)
          })
        }
      )
    }
  }, [accountId, asset, service, isUnsupportedPricing, newCancelToken])

  const initializeComputeEnvironment = useCallback(async () => {
    const computeEnvs = await getComputeEnvironments(
      service.serviceEndpoint,
      asset.credentialSubject?.chainId
    )
    setComputeEnvs(computeEnvs || [])
  }, [asset, service])

  useEffect(() => {
    initializeComputeEnvironment()
  }, [initializeComputeEnvironment])

  const fetchJobs = useCallback(
    async (type: string) => {
      if (!chainIds || chainIds.length === 0 || !accountId) {
        return
      }

      try {
        type === 'init' && setIsLoadingJobs(true)
        const computeJobs = await getComputeJobs(
          asset.credentialSubject?.chainId !== undefined
            ? [asset.credentialSubject.chainId]
            : chainIds,
          address,
          asset,
          service,
          newCancelToken()
        )
        setJobs(computeJobs.computeJobs)
        setIsLoadingJobs(!computeJobs.isLoaded)
      } catch (error) {
        LoggerInstance.error(error.message)
        setIsLoadingJobs(false)
      }
    },
    [address, accountId, asset, service, chainIds, newCancelToken]
  )

  useEffect(() => {
    fetchJobs('init')
  }, [refetchJobs])

  // Output errors in toast UI
  useEffect(() => {
    const newError = error
    if (!newError) return
    const errorMsg = newError + '. Please retry.'
    toast.error(errorMsg)
  }, [error])

  async function setAlgoPrice(
    algo: AssetExtended,
    algoService: Service,
    algoAccessDetails,
    algoProviderFees: ProviderFees
  ) {
    if (
      algoAccessDetails.addressOrId !== ZERO_ADDRESS &&
      algoAccessDetails?.type !== 'free' &&
      algoProviderFees
    ) {
      const algorithmOrderPriceAndFees = await getOrderPriceAndFees(
        algo,
        algoService,
        algoAccessDetails,
        accountId || ZERO_ADDRESS,
        signer,
        algoProviderFees
      )
      if (!algorithmOrderPriceAndFees)
        throw new Error('Error setting algorithm price and fees!')

      setAlgoOrderPriceAndFees(algorithmOrderPriceAndFees)
      return algorithmOrderPriceAndFees
    }
  }

  async function startJob(
    userCustomParameters: {
      dataServiceParams?: UserCustomParameters
      algoServiceParams?: UserCustomParameters
      algoParams?: UserCustomParameters
    },
    datasetServices?: { asset: AssetExtended; service: Service }[]
  ): Promise<void> {
    try {
      setIsOrdering(true)
      setIsOrdered(false)
      setError(undefined)

      const {
        datasetResponses,
        actualAlgorithmAsset,
        actualAlgoService,
        actualAlgoAccessDetails,
        initializedProvider
      } = await initPriceAndFees(datasetServices)

      const computeAlgorithm: ComputeAlgorithm = {
        documentId: actualAlgorithmAsset?.id,
        serviceId: actualAlgoService.id,
        algocustomdata: userCustomParameters?.algoParams,
        userdata: userCustomParameters?.algoServiceParams
      }

      // Check isOrderable for all datasets
      for (const ds of datasetResponses) {
        const allowed = await isOrderable(
          ds.actualDatasetAsset,
          ds.actualDatasetService.id,
          computeAlgorithm,
          actualAlgorithmAsset
        )
        if (!allowed)
          throw new Error(
            `Dataset ${ds.actualDatasetAsset.id} is not orderable.`
          )
      }

      setComputeStatusText(
        getComputeFeedback(
          actualAlgoAccessDetails?.baseToken?.symbol,
          actualAlgoAccessDetails?.datatoken?.symbol,
          actualAlgorithmAsset.credentialSubject?.metadata.type
        )[actualAlgoAccessDetails?.type === 'fixed' ? 2 : 3]
      )

      const algoOrderPriceAndFeesResponse = await setAlgoPrice(
        actualAlgorithmAsset,
        actualAlgoService,
        actualAlgoAccessDetails,
        initializedProvider?.algorithm?.providerFee ||
          initializedProviderResponse?.algorithm?.providerFee
      )
      const algorithmOrderTx = await handleComputeOrder(
        signer,
        actualAlgorithmAsset,
        actualAlgoService,
        actualAlgoAccessDetails,
        algoOrderPriceAndFees || algoOrderPriceAndFeesResponse,
        accountId,
        initializedProvider?.algorithm ||
          initializedProviderResponse?.algorithm,
        hasAlgoAssetDatatoken,
        lookupVerifierSessionId(
          datasetResponses[0].actualDatasetAsset.id,
          datasetResponses[0].actualDatasetService.id
        ),
        selectedComputeEnv.consumerAddress
      )
      if (!algorithmOrderTx) throw new Error('Failed to order algorithm.')

      const datasetInputs = []
      const policyDatasets: PolicyServerInitiateComputeActionData[] = []

      for (const ds of datasetResponses) {
        const datasetOrderTx = await handleComputeOrder(
          signer,
          ds.actualDatasetAsset,
          ds.actualDatasetService,
          ds.actualDatasetAccessDetails,
          datasetOrderPriceAndFees || ds.datasetOrderPriceResponse,
          accountId,
          ds.initializedProvider.datasets[0],
          hasDatatoken,
          lookupVerifierSessionId(
            ds.actualDatasetAsset.id,
            ds.actualDatasetService.id
          ),
          selectedComputeEnv.consumerAddress
        )
        if (!datasetOrderTx)
          throw new Error(
            `Failed to order dataset ${ds.actualDatasetAsset.id}.`
          )

        datasetInputs.push({
          documentId: ds.actualDatasetAsset.id,
          serviceId: ds.actualDatasetService.id,
          transferTxId: datasetOrderTx,
          userdata: userCustomParameters?.dataServiceParams
        })

        policyDatasets.push({
          sessionId: lookupVerifierSessionId(
            ds.actualDatasetAsset.id,
            ds.actualDatasetService.id
          ),
          serviceId: ds.actualDatasetService.id,
          documentId: ds.actualDatasetAsset.id,
          successRedirectUri: '',
          errorRedirectUri: '',
          responseRedirectUri: '',
          presentationDefinitionUri: ''
        })
      }

      setComputeStatusText(getComputeFeedback()[4])
      let resourceRequests
      if (selectedResources.mode === 'free') {
        resourceRequests = selectedComputeEnv.resources.map((res) => ({
          id: res.id,
          amount: res.inUse
        }))
      } else {
        resourceRequests = selectedComputeEnv.resources.map((res) => ({
          id: res.id,
          amount: selectedResources[res.id] || res.min
        }))
      }

      const policyServerAlgo: PolicyServerInitiateComputeActionData = {
        sessionId: lookupVerifierSessionId(
          actualAlgorithmAsset.id,
          actualAlgoService.id
        ),
        serviceId: actualAlgoService.id,
        documentId: actualAlgorithmAsset.id,
        successRedirectUri: '',
        errorRedirectUri: '',
        responseRedirectUri: '',
        presentationDefinitionUri: ''
      }

      const policiesServer = [policyServerAlgo, ...policyDatasets]

      let response
      if (selectedResources.mode === 'paid') {
        response = await ProviderInstance.computeStart(
          service.serviceEndpoint,
          signer,
          selectedComputeEnv.id,
          datasetInputs,
          { ...computeAlgorithm, transferTxId: algorithmOrderTx },
          selectedResources.jobDuration,
          oceanTokenAddress,
          resourceRequests,
          datasetResponses[0].actualDatasetAsset.credentialSubject.chainId,
          null,
          null,
          policiesServer
        )
      } else {
        const algorithm: ComputeAlgorithm = {
          documentId: actualAlgorithmAsset.id,
          serviceId: actualAlgoService.id,
          meta: actualAlgorithmAsset.credentialSubject?.metadata
            ?.algorithm as any
        }

        response = await ProviderInstance.freeComputeStart(
          service.serviceEndpoint,
          signer,
          selectedComputeEnv.id,
          datasetInputs.map(({ documentId, serviceId }) => ({
            documentId,
            serviceId
          })),
          algorithm,
          resourceRequests,
          null,
          null,
          policiesServer
        )
      }

      if (!response)
        throw new Error(
          'Failed to start compute job, check console for more details.'
        )

      setIsOrdered(true)
      setRefetchJobs(!refetchJobs)
    } catch (error) {
      let message: string
      try {
        message =
          error.message && typeof error.message === 'string'
            ? JSON.parse(error.message)
            : error.message || String(error)
      } catch {
        message = error.message || String(error)
      }
      setError(message)
      setRetry(true)
    } finally {
      setIsOrdering(false)
    }
  }

  const onSubmit = async (values: ComputeDatasetForm) => {
    try {
      const skip = lookupVerifierSessionIdSkip(asset?.id, service?.id)

      if (appConfig.ssiEnabled && !skip) {
        try {
          const result = await checkVerifierSessionId(
            lookupVerifierSessionId(asset.id, service.id)
          )
          if (!result.success) {
            toast.error('Invalid session')
            return
          }
        } catch (error) {
          resetCacheWallet()
          throw error
        }
      }

      if (
        !(values.algorithm || values.dataset) ||
        !values.computeEnv ||
        !values.termsAndConditions ||
        !values.acceptPublishingLicense
      ) {
        toast.error('Please complete all required fields.')
        return
      }

      let actualSelectedDataset: AssetExtended[] = []
      let actualSelectedAlgorithm: AssetExtended = selectedAlgorithmAsset

      // Case: dataset selected, algorithm undefined (algo is main asset)
      if (asset.credentialSubject.metadata.type === 'algorithm') {
        actualSelectedAlgorithm = asset
        if (selectedDatasetAsset && Array.isArray(selectedDatasetAsset)) {
          actualSelectedDataset = selectedDatasetAsset
        }
      } else {
        actualSelectedDataset = [asset]
      }

      const userCustomParameters = {
        dataServiceParams: parseConsumerParameterValues(
          values?.dataServiceParams,
          actualSelectedDataset[0]?.credentialSubject?.services?.[0]
            ?.consumerParameters
        ),
        algoServiceParams: parseConsumerParameterValues(
          values?.algoServiceParams,
          actualSelectedAlgorithm?.credentialSubject?.services[svcIndex]
            ?.consumerParameters
        ),
        algoParams: parseConsumerParameterValues(
          values?.algoParams,
          actualSelectedAlgorithm?.credentialSubject?.metadata?.algorithm
            ?.consumerParameters
        )
      }

      const datasetServices: { asset: AssetExtended; service: Service }[] =
        actualSelectedDataset.map((ds, i) => {
          const datasetEntry = values.dataset?.[i]
          const selectedServiceId = datasetEntry?.includes('|')
            ? datasetEntry.split('|')[1]
            : ds.credentialSubject.services?.[0]?.id

          const selectedService =
            ds.credentialSubject.services.find(
              (s) => s.id === selectedServiceId
            ) || ds.credentialSubject.services?.[0]

          return {
            asset: ds,
            service: selectedService
          }
        })

      await startJob(userCustomParameters, datasetServices)
    } catch (error) {
      toast.error(error.message)
      LoggerInstance.error(error)
    }
  }

  return (
    <>
      <div
        className={`${styles.info} ${
          isUnsupportedPricing ? styles.warning : null
        }`}
      >
        <FileIcon
          file={file}
          isAccountWhitelisted={isAccountIdWhitelisted}
          isLoading={fileIsLoading}
          small
        />
        {isUnsupportedPricing ? (
          <Alert
            text={`No pricing schema available for this asset.`}
            state="info"
          />
        ) : (
          <div className={styles.priceClass}>
            <Price
              price={price}
              orderPriceAndFees={datasetOrderPriceAndFees}
              size="large"
            />
          </div>
        )}
      </div>

      {isUnsupportedPricing ? null : asset.credentialSubject?.metadata.type ===
        'algorithm' ? (
        <Formik
          initialValues={getInitialValues(
            service,
            selectedAlgorithmAsset,
            selectedComputeEnv,
            termsAndConditions,
            acceptPublishingLicense
          )}
          validateOnMount
          validationSchema={getComputeValidationSchema(
            service.consumerParameters,
            selectedAlgorithmAsset?.credentialSubject?.services[svcIndex]
              ?.consumerParameters,
            selectedAlgorithmAsset?.credentialSubject?.metadata?.algorithm
              ?.consumerParameters
          )}
          onSubmit={(values) => {
            if (
              !lookupVerifierSessionId(asset.id, service.id) &&
              appConfig.ssiEnabled
            ) {
              return
            }
            onSubmit(values)
          }}
        >
          {appConfig.ssiEnabled ? (
            <>
              {verifierSessionCache &&
              lookupVerifierSessionId(asset.id, service.id) ? (
                <>
                  {service.type === 'compute' && (
                    <Alert
                      text={
                        "This algorithm has been set to private by the publisher and can't be downloaded. You can run it against any allowed datasets though!"
                      }
                      state="info"
                    />
                  )}
                  <CredentialDialogProvider>
                    <FormStartComputeAlgo
                      asset={asset}
                      service={service}
                      accessDetails={accessDetails}
                      datasets={datasetList}
                      selectedDatasetAsset={selectedDatasetAsset}
                      setSelectedDatasetAsset={setSelectedDatasetAsset}
                      isLoading={isOrdering || isRequestingAlgoOrderPrice}
                      isComputeButtonDisabled={isComputeButtonDisabled}
                      hasPreviousOrder={!!validOrderTx}
                      hasDatatoken={hasDatatoken}
                      dtBalance={dtBalance}
                      assetTimeout={secondsToString(service.timeout)}
                      hasPreviousOrderSelectedComputeAsset={
                        !!validAlgorithmOrderTx
                      }
                      hasDatatokenSelectedComputeAsset={hasAlgoAssetDatatoken}
                      isAccountIdWhitelisted={isAccountIdWhitelisted}
                      datasetSymbol={
                        accessDetails.baseToken?.symbol ||
                        (asset.credentialSubject?.chainId === 137
                          ? 'mOCEAN'
                          : 'OCEAN')
                      }
                      algorithmSymbol={
                        selectedAlgorithmAsset?.accessDetails?.[svcIndex]
                          ?.baseToken?.symbol ||
                        (selectedAlgorithmAsset?.credentialSubject?.chainId ===
                        137
                          ? 'mOCEAN'
                          : 'OCEAN')
                      }
                      providerFeesSymbol={providerFeesSymbol}
                      dtSymbolSelectedComputeAsset={
                        selectedAlgorithmAsset?.accessDetails?.[svcIndex]
                          ?.datatoken.symbol
                      }
                      dtBalanceSelectedComputeAsset={algorithmDTBalance}
                      selectedComputeAssetType="algorithm"
                      selectedComputeAssetTimeout={secondsToString(
                        selectedAlgorithmAsset?.credentialSubject?.services[
                          svcIndex
                        ]?.timeout
                      )}
                      allResourceValues={allResourceValues}
                      setAllResourceValues={setAllResourceValues}
                      // lazy comment when removing pricingStepText
                      stepText={computeStatusText}
                      isConsumable={isConsumablePrice}
                      consumableFeedback={consumableFeedback}
                      datasetOrderPriceAndFees={datasetOrderPriceAndFees}
                      algoOrderPriceAndFees={algoOrderPriceAndFees}
                      retry={retry}
                      computeEnvs={computeEnvs}
                    />
                  </CredentialDialogProvider>
                  {/* <AlgorithmDatasetsListForCompute
                    asset={asset}
                    service={service}
                    accessDetails={accessDetails}
                  /> */}
                </>
              ) : (
                <AssetActionCheckCredentials asset={asset} service={service} />
              )}
            </>
          ) : (
            <>
              {service.type === 'compute' && (
                <Alert
                  text={
                    "This algorithm has been set to private by the publisher and can't be downloaded. You can run it against any allowed datasets though!"
                  }
                  state="info"
                />
              )}
              <AlgorithmDatasetsListForCompute
                asset={asset}
                service={service}
                accessDetails={accessDetails}
              />
            </>
          )}
        </Formik>
      ) : (
        <Formik
          initialValues={getInitialValues(
            service,
            selectedAlgorithmAsset,
            selectedComputeEnv,
            termsAndConditions,
            acceptPublishingLicense
          )}
          validateOnMount
          validationSchema={getComputeValidationSchema(
            service.consumerParameters,
            selectedAlgorithmAsset?.credentialSubject?.services[svcIndex]
              ?.consumerParameters,
            selectedAlgorithmAsset?.credentialSubject?.metadata?.algorithm
              ?.consumerParameters
          )}
          onSubmit={(values) => {
            if (
              !lookupVerifierSessionId(asset.id, service.id) &&
              appConfig.ssiEnabled
            ) {
              return
            }
            onSubmit(values)
          }}
        >
          {appConfig.ssiEnabled ? (
            <>
              {verifierSessionCache &&
              lookupVerifierSessionId(asset.id, service.id) ? (
                <CredentialDialogProvider>
                  <FormStartComputeDataset
                    asset={asset}
                    service={service}
                    accessDetails={accessDetails}
                    algorithms={algorithmList}
                    ddoListAlgorithms={ddoAlgorithmList}
                    selectedAlgorithmAsset={selectedAlgorithmAsset}
                    setSelectedAlgorithmAsset={setSelectedAlgorithmAsset}
                    isLoading={isOrdering || isRequestingAlgoOrderPrice}
                    isComputeButtonDisabled={isComputeButtonDisabled}
                    hasPreviousOrder={!!validOrderTx}
                    hasDatatoken={hasDatatoken}
                    dtBalance={dtBalance}
                    assetTimeout={secondsToString(service.timeout)}
                    hasPreviousOrderSelectedComputeAsset={
                      !!validAlgorithmOrderTx
                    }
                    hasDatatokenSelectedComputeAsset={hasAlgoAssetDatatoken}
                    isAccountIdWhitelisted={isAccountIdWhitelisted}
                    datasetSymbol={
                      accessDetails.baseToken?.symbol ||
                      (asset.credentialSubject?.chainId === 137
                        ? 'mOCEAN'
                        : 'OCEAN')
                    }
                    algorithmSymbol={
                      selectedAlgorithmAsset?.accessDetails?.[svcIndex]
                        ?.baseToken?.symbol ||
                      (selectedAlgorithmAsset?.credentialSubject?.chainId ===
                      137
                        ? 'mOCEAN'
                        : 'OCEAN')
                    }
                    providerFeesSymbol={providerFeesSymbol}
                    dtSymbolSelectedComputeAsset={
                      selectedAlgorithmAsset?.accessDetails?.[svcIndex]
                        ?.datatoken.symbol
                    }
                    dtBalanceSelectedComputeAsset={algorithmDTBalance}
                    selectedComputeAssetType="algorithm"
                    selectedComputeAssetTimeout={secondsToString(
                      selectedAlgorithmAsset?.credentialSubject?.services[
                        svcIndex
                      ]?.timeout
                    )}
                    allResourceValues={allResourceValues}
                    setAllResourceValues={setAllResourceValues}
                    // lazy comment when removing pricingStepText
                    stepText={computeStatusText}
                    isConsumable={isConsumablePrice}
                    consumableFeedback={consumableFeedback}
                    datasetOrderPriceAndFees={datasetOrderPriceAndFees}
                    algoOrderPriceAndFees={algoOrderPriceAndFees}
                    retry={retry}
                    onRunInitPriceAndFees={async () => {
                      await initPriceAndFees()
                    }}
                    onCheckAlgoDTBalance={() =>
                      checkAssetDTBalance(selectedAlgorithmAsset)
                    }
                    computeEnvs={computeEnvs}
                  />
                </CredentialDialogProvider>
              ) : (
                <div className={styles.actionButton}>
                  {' '}
                  <AssetActionCheckCredentials
                    asset={asset}
                    service={service}
                  />
                </div>
              )}
            </>
          ) : (
            <CredentialDialogProvider>
              <FormStartComputeDataset
                asset={asset}
                service={service}
                accessDetails={accessDetails}
                algorithms={algorithmList}
                ddoListAlgorithms={ddoAlgorithmList}
                selectedAlgorithmAsset={selectedAlgorithmAsset}
                setSelectedAlgorithmAsset={setSelectedAlgorithmAsset}
                isLoading={isOrdering || isRequestingAlgoOrderPrice}
                isComputeButtonDisabled={isComputeButtonDisabled}
                hasPreviousOrder={!!validOrderTx}
                hasDatatoken={hasDatatoken}
                dtBalance={dtBalance}
                assetTimeout={secondsToString(service.timeout)}
                hasPreviousOrderSelectedComputeAsset={!!validAlgorithmOrderTx}
                hasDatatokenSelectedComputeAsset={hasAlgoAssetDatatoken}
                isAccountIdWhitelisted={isAccountIdWhitelisted}
                datasetSymbol={
                  accessDetails.baseToken?.symbol ||
                  (asset.credentialSubject?.chainId === 137
                    ? 'mOCEAN'
                    : 'OCEAN')
                }
                algorithmSymbol={
                  selectedAlgorithmAsset?.accessDetails?.[svcIndex]?.baseToken
                    ?.symbol ||
                  (selectedAlgorithmAsset?.credentialSubject?.chainId === 137
                    ? 'mOCEAN'
                    : 'OCEAN')
                }
                providerFeesSymbol={providerFeesSymbol}
                dtSymbolSelectedComputeAsset={
                  selectedAlgorithmAsset?.accessDetails?.[svcIndex]?.datatoken
                    .symbol
                }
                dtBalanceSelectedComputeAsset={algorithmDTBalance}
                selectedComputeAssetType="algorithm"
                selectedComputeAssetTimeout={secondsToString(
                  selectedAlgorithmAsset?.credentialSubject?.services[svcIndex]
                    ?.timeout
                )}
                allResourceValues={allResourceValues}
                setAllResourceValues={setAllResourceValues}
                // lazy comment when removing pricingStepText
                stepText={computeStatusText}
                isConsumable={isConsumablePrice}
                consumableFeedback={consumableFeedback}
                datasetOrderPriceAndFees={datasetOrderPriceAndFees}
                algoOrderPriceAndFees={algoOrderPriceAndFees}
                retry={retry}
                onRunInitPriceAndFees={async () => {
                  await initPriceAndFees()
                }}
                onCheckAlgoDTBalance={() =>
                  checkAssetDTBalance(selectedAlgorithmAsset)
                }
                computeEnvs={computeEnvs}
              />
            </CredentialDialogProvider>
          )}
        </Formik>
      )}

      <footer className={styles.feedback}>
        {isOrdered && (
          <SuccessConfetti success="Your job started successfully! Watch the progress below or on your profile." />
        )}
      </footer>
      {accountId && (
        <WhitelistIndicator
          accountId={accountId}
          isAccountIdWhitelisted={isAccountIdWhitelisted}
        />
      )}
      {accountId &&
        accessDetails.datatoken &&
        asset.credentialSubject.metadata.type !== 'algorithm' && (
          <ComputeHistory
            title="Your Compute Jobs"
            refetchJobs={() => setRefetchJobs(!refetchJobs)}
          >
            <ComputeJobs
              minimal
              jobs={jobs}
              isLoading={isLoadingJobs}
              refetchJobs={() => setRefetchJobs(!refetchJobs)}
            />
          </ComputeHistory>
        )}
    </>
  )
}
