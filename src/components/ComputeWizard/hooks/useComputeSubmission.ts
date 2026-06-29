import { useCallback, useState } from 'react'
import {
  ComputeAlgorithm,
  ComputeOutput,
  ProviderInstance,
  ComputeEnvironment,
  ProviderComputeInitializeResults,
  ProviderFees,
  ZERO_ADDRESS
} from '@oceanprotocol/lib'
import { isOrderable } from '@utils/compute'
import { handleComputeOrder } from '@utils/order'
import { getComputeFeedback } from '@utils/feedback'
import { AssetExtended } from 'src/@types/AssetExtended'
import { Service } from 'src/@types/ddo/Service'
import { ResourceType } from 'src/@types/ResourceType'
import { Signer } from 'ethers'
import { getOrderPriceAndFees } from '@utils/accessDetailsAndPricing'
import { resolveVerifierSessionId } from '@utils/verifierSession'
import { FormComputeData } from '../_types'
import { storeComputeOutputEncryptionKey } from '../outputStorage'
import {
  ComputeStartProgressPhase,
  ComputeStartProgressStatus,
  createComputeStartProgress
} from '../progress'

type DatasetResponse = {
  asset: AssetExtended
  service: Service
  accessDetails: AccessDetails
  datasetOrderPriceResponse?: OrderPriceAndFees
  initializedProviderDataset?: ProviderFees
}

type UserParamsPayload = {
  dataServiceParams?: any | any[]
  algoServiceParams?: any
  algoParams?: any
}

type StartJobParams = {
  datasetResponses: DatasetResponse[]
  algorithmAsset: AssetExtended
  algorithmService: Service
  algorithmAccessDetails: AccessDetails
  initializedProvider: ProviderComputeInitializeResults
  selectedComputeEnv: ComputeEnvironment
  selectedResources: ResourceType
  accountId?: string
  signer: Signer
  hasDatatoken?: boolean
  hasAlgoAssetDatatoken?: boolean
  userCustomParameters?: UserParamsPayload
  lookupVerifierSessionId: (did: string, serviceId: string) => string
  algoOrderPriceAndFees?: OrderPriceAndFees
  datasetOrderPriceAndFees?: OrderPriceAndFees
  paymentTokenAddress?: string
  // oceanTokenAddress?: string
  computeServiceEndpoint?: string
  computeOutput?: ComputeOutput
  computeOutputEncryptionKey?: string
  computeOutputStorage?: FormComputeData['outputStorage']
  queueMaxWaitTime?: number
}

async function setAlgoPrice(
  algo: AssetExtended,
  algoService: Service,
  algoAccessDetails: AccessDetails,
  accountId: string,
  signer: Signer,
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

    return algorithmOrderPriceAndFees
  }
}

function buildResourceRequests(
  selectedComputeEnv: ComputeEnvironment,
  selectedResources: ResourceType
) {
  const normalizeResourceKey = (
    res: ComputeEnvironment['resources'][number]
  ): string => {
    const resourceId = res.id?.toLowerCase() || ''
    if (res.type === 'gpu' || resourceId.includes('gpu')) return 'gpu'
    if (resourceId.includes('cpu')) return 'cpu'
    if (resourceId.includes('ram')) return 'ram'
    if (resourceId.includes('disk')) return 'disk'
    return res.id
  }

  const resolveSelectedAmount = (
    res: ComputeEnvironment['resources'][number]
  ): number => {
    const resourceKey = normalizeResourceKey(res)
    if (resourceKey === 'gpu') {
      return Number(selectedResources.gpu ?? 0)
    }
    if (resourceKey === 'cpu')
      return Number(selectedResources.cpu ?? res.min ?? 0)
    if (resourceKey === 'ram')
      return Number(selectedResources.ram ?? res.min ?? 0)
    if (resourceKey === 'disk')
      return Number(selectedResources.disk ?? res.min ?? 0)
    return Number((selectedResources as any)[res.id] ?? res.min ?? 0)
  }

  const uniqueResources = (
    resources: ComputeEnvironment['resources']
  ): ComputeEnvironment['resources'] => {
    const seen = new Set<string>()
    return resources.filter((res) => {
      const key = normalizeResourceKey(res)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  if (selectedResources.mode === 'free') {
    const freeResources = selectedComputeEnv.free?.resources?.length
      ? selectedComputeEnv.free.resources
      : selectedComputeEnv.resources

    return uniqueResources(freeResources).map((res) => ({
      id: res.id,
      amount: resolveSelectedAmount(res)
    }))
  }

  return uniqueResources(selectedComputeEnv.resources).map((res) => ({
    id: res.id,
    amount: resolveSelectedAmount(res)
  }))
}

export function useComputeSubmission() {
  const [isOrdering, setIsOrdering] = useState(false)
  const [computeStatusText, setComputeStatusText] = useState('')
  const [computeProgressSteps, setComputeProgressSteps] = useState(
    createComputeStartProgress
  )
  const [successJobId, setSuccessJobId] = useState<string>()
  const [showSuccess, setShowSuccess] = useState(false)
  const [retry, setRetry] = useState(false)
  const [submitError, setSubmitError] = useState<string>()

  const resetComputeProgress = useCallback(() => {
    setComputeProgressSteps(createComputeStartProgress())
  }, [])

  const setComputeProgressStep = useCallback(
    (phase: ComputeStartProgressPhase, status: ComputeStartProgressStatus) => {
      setComputeProgressSteps((steps) =>
        steps.map((step) => (step.id === phase ? { ...step, status } : step))
      )
    },
    []
  )

  const setActiveComputeProgressError = useCallback(() => {
    setComputeProgressSteps((steps) => {
      const activeIndex = steps.findIndex((step) => step.status === 'active')
      if (activeIndex === -1) return steps

      return steps.map((step, index) =>
        index === activeIndex ? { ...step, status: 'error' } : step
      )
    })
  }, [])

  const startJob = useCallback(
    async ({
      datasetResponses,
      algorithmAsset,
      algorithmService,
      algorithmAccessDetails,
      initializedProvider,
      selectedComputeEnv,
      selectedResources,
      accountId,
      signer,
      hasDatatoken,
      hasAlgoAssetDatatoken,
      userCustomParameters,
      lookupVerifierSessionId,
      algoOrderPriceAndFees,
      datasetOrderPriceAndFees,
      paymentTokenAddress,
      // oceanTokenAddress,
      computeServiceEndpoint,
      computeOutput,
      computeOutputEncryptionKey,
      computeOutputStorage,
      queueMaxWaitTime
    }: StartJobParams) => {
      try {
        setIsOrdering(true)
        setSubmitError(undefined)
        setRetry(false)

        const computeAlgorithm: ComputeAlgorithm = {
          documentId: algorithmAsset?.id,
          serviceId: algorithmService.id,
          algocustomdata: userCustomParameters?.algoServiceParams,
          userdata: userCustomParameters?.algoServiceParams
        }

        for (const ds of datasetResponses) {
          const allowed = await isOrderable(
            ds.asset,
            ds.service.id,
            computeAlgorithm,
            algorithmAsset
          )
          if (!allowed)
            throw new Error(`Dataset ${ds.asset.id} is not orderable.`)
        }

        setComputeStatusText(
          getComputeFeedback(
            algorithmAccessDetails?.baseToken?.symbol,
            algorithmAccessDetails?.datatoken?.symbol,
            algorithmAsset.credentialSubject?.metadata?.type
          )[algorithmAccessDetails?.type === 'fixed' ? 2 : 3]
        )

        setComputeProgressStep('approvals', 'active')
        const algoOrderPriceAndFeesResponse =
          algoOrderPriceAndFees ||
          (await setAlgoPrice(
            algorithmAsset,
            algorithmService,
            algorithmAccessDetails,
            accountId,
            signer,
            initializedProvider?.algorithm?.providerFee
          ))

        const firstDataset = datasetResponses[0]
        const algorithmSession = firstDataset
          ? resolveVerifierSessionId(
              firstDataset.asset.id,
              firstDataset.service.id,
              lookupVerifierSessionId(
                firstDataset.asset.id,
                firstDataset.service.id
              )
            )
          : resolveVerifierSessionId(
              algorithmAsset.id,
              algorithmService.id,
              lookupVerifierSessionId(algorithmAsset.id, algorithmService.id)
            )

        setComputeProgressStep('approvals', 'completed')
        setComputeProgressStep('buy', 'active')

        const algorithmOrderTx = await handleComputeOrder(
          signer,
          algorithmAsset,
          algorithmService,
          algorithmAccessDetails,
          algoOrderPriceAndFees || algoOrderPriceAndFeesResponse,
          accountId,
          initializedProvider?.algorithm,
          hasAlgoAssetDatatoken,
          algorithmSession,
          selectedComputeEnv.consumerAddress
        )
        if (!algorithmOrderTx) throw new Error('Failed to order algorithm.')

        const datasetInputs = []
        const policyDatasets = []

        for (const [i, ds] of datasetResponses.entries()) {
          const datasetOrderTx = await handleComputeOrder(
            signer,
            ds.asset,
            ds.service,
            ds.accessDetails,
            datasetOrderPriceAndFees || ds.datasetOrderPriceResponse,
            accountId,
            initializedProvider.datasets?.[i],
            hasDatatoken,
            resolveVerifierSessionId(
              ds.asset.id,
              ds.service.id,
              lookupVerifierSessionId(ds.asset.id, ds.service.id)
            ),
            selectedComputeEnv.consumerAddress
          )

          if (!datasetOrderTx)
            throw new Error(`Failed to order dataset ${ds.asset.id}.`)

          const paramsPayload = Array.isArray(
            userCustomParameters?.dataServiceParams
          )
            ? userCustomParameters?.dataServiceParams?.[i] || {}
            : userCustomParameters?.dataServiceParams

          datasetInputs.push({
            documentId: ds.asset.id,
            serviceId: ds.service.id,
            transferTxId: datasetOrderTx,
            userdata: paramsPayload
          })

          policyDatasets.push({
            sessionId: resolveVerifierSessionId(
              ds.asset.id,
              ds.service.id,
              lookupVerifierSessionId(ds.asset.id, ds.service.id)
            ),
            serviceId: ds.service.id,
            documentId: ds.asset.id,
            successRedirectUri: '',
            errorRedirectUri: '',
            responseRedirectUri: '',
            presentationDefinitionUri: ''
          })
        }
        setComputeProgressStep('buy', 'completed')

        setComputeStatusText(getComputeFeedback()[4])
        const resourceRequests = buildResourceRequests(
          selectedComputeEnv,
          selectedResources
        )

        const providerEndpoint =
          computeServiceEndpoint ||
          firstDataset?.service?.serviceEndpoint ||
          algorithmService.serviceEndpoint
        const paymentToken =
          paymentTokenAddress || algorithmAccessDetails?.baseToken?.address

        const policyServerAlgo = {
          sessionId: resolveVerifierSessionId(
            algorithmAsset.id,
            algorithmService.id,
            lookupVerifierSessionId(algorithmAsset.id, algorithmService.id)
          ),
          serviceId: algorithmService.id,
          documentId: algorithmAsset.id,
          successRedirectUri: '',
          errorRedirectUri: '',
          responseRedirectUri: '',
          presentationDefinitionUri: ''
        }

        const policiesServer = [policyServerAlgo, ...policyDatasets]
        setComputeProgressStep('create', 'active')

        let response
        if (selectedResources.mode === 'paid') {
          response = await ProviderInstance.computeStart(
            providerEndpoint,
            signer,
            selectedComputeEnv.id,
            datasetInputs,
            { ...computeAlgorithm, transferTxId: algorithmOrderTx },
            selectedResources.jobDuration,
            paymentToken,
            resourceRequests,
            firstDataset?.asset.credentialSubject.chainId ??
              algorithmAsset.credentialSubject.chainId,
            null,
            null,
            computeOutput,
            policiesServer as any,
            undefined,
            queueMaxWaitTime
          )
        } else {
          const algorithm: ComputeAlgorithm = {
            documentId: algorithmAsset.id,
            serviceId: algorithmService.id,
            meta: algorithmAsset.credentialSubject?.metadata?.algorithm as any
          }
          response = await ProviderInstance.freeComputeStart(
            providerEndpoint,
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
            computeOutput,
            policiesServer as any,
            undefined,
            queueMaxWaitTime
          )
        }

        if (!response)
          throw new Error(
            'Failed to start compute job, check console for more details.'
          )
        setComputeProgressStep('create', 'completed')

        setSuccessJobId(response?.jobId || response?.id || 'N/A')
        const responseJobId = response?.jobId || response?.id
        if (responseJobId && computeOutputEncryptionKey) {
          storeComputeOutputEncryptionKey(
            responseJobId,
            computeOutputEncryptionKey,
            computeOutputStorage
          )
        }
        setShowSuccess(true)
      } catch (error) {
        setActiveComputeProgressError()
        if (
          (error as Error)?.message?.includes('user rejected transaction') ||
          (error as Error)?.message?.includes('User denied') ||
          (error as Error)?.message?.includes(
            'MetaMask Tx Signature: User denied'
          )
        ) {
          setRetry(true)
          throw error
        }

        const message =
          (error as Error)?.message || 'Failed to start compute job.'
        setSubmitError(message)
        setRetry(true)
        throw error
      } finally {
        setIsOrdering(false)
      }
    },
    [setActiveComputeProgressError, setComputeProgressStep]
  )

  return {
    startJob,
    isOrdering,
    computeStatusText,
    computeProgressSteps,
    resetComputeProgress,
    setComputeProgressStep,
    setActiveComputeProgressError,
    successJobId,
    showSuccess,
    setShowSuccess,
    retry,
    submitError,
    setSubmitError
  }
}
