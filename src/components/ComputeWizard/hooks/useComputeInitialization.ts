import { useCallback, useState } from 'react'
import {
  ComputeEnvironment,
  ComputeOutput,
  ProviderComputeInitializeResults,
  ProviderFees,
  EscrowContract,
  ZERO_ADDRESS
} from '@oceanprotocol/lib'
import type { dockerRegistryAuth as DockerRegistryAuth } from '@oceanprotocol/lib'
import { initializeProviderForComputeMulti } from '@utils/provider'
import { getOrderPriceAndFees } from '@utils/accessDetailsAndPricing'
import { getTokenInfo } from '@utils/wallet'
import { ethers, Signer } from 'ethers'
import { AssetExtended } from 'src/@types/AssetExtended'
import { Service } from 'src/@types/ddo/Service'
import { ResourceType } from 'src/@types/ResourceType'
import {
  ComputeStartProgressPhase,
  ComputeStartProgressStatus
} from '../progress'
import { prepareEscrowPayment } from './escrowPayment'

type DatasetServiceSelection = {
  asset: AssetExtended
  service: Service
  accessDetails: AccessDetails
  sessionId: string
}

type InitializeParams = {
  datasetsForProvider: DatasetServiceSelection[]
  algorithmAsset: AssetExtended
  algorithmService: Service
  algorithmAccessDetails: AccessDetails
  algoSessionId?: string
  signer: Signer
  selectedComputeEnv: ComputeEnvironment
  selectedResources: ResourceType
  algoIndex: number
  paymentTokenAddress: string
  computeOutput?: ComputeOutput
  queueMaxWaitTime?: number
  algoParams?: Record<string, any>
  datasetParams?: Record<string, any>
  dockerRegistryAuth?: DockerRegistryAuth
  accountId?: string
  shouldPrepareEscrow?: boolean
  onEscrowPrepared?: () => void
  onProgress?: (
    phase: ComputeStartProgressPhase,
    status: ComputeStartProgressStatus
  ) => void
}

type InitializeResult = {
  initializedProvider: ProviderComputeInitializeResults
  datasetResponses: Array<{
    asset: AssetExtended
    service: Service
    accessDetails: AccessDetails
    datasetOrderPriceResponse?: OrderPriceAndFees
  }>
  algoOrderPriceAndFees?: OrderPriceAndFees
}

async function setDatasetPrice(
  asset: AssetExtended,
  service: Service,
  accessDetails: AccessDetails,
  accountId: string,
  signer: Signer,
  datasetProviderFees: ProviderFees
) {
  if (
    accessDetails.addressOrId !== ZERO_ADDRESS &&
    accessDetails.type !== 'free' &&
    datasetProviderFees
  ) {
    const datasetPriceAndFees = await getOrderPriceAndFees(
      asset,
      service,
      accessDetails,
      accountId || ZERO_ADDRESS,
      signer,
      datasetProviderFees
    )
    if (!datasetPriceAndFees)
      throw new Error('Error setting dataset price and fees!')

    return datasetPriceAndFees
  }
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

export function useComputeInitialization({
  web3Provider
}: {
  web3Provider?: any
}) {
  const [initializedProviderResponse, setInitializedProviderResponse] =
    useState<ProviderComputeInitializeResults>()
  const [datasetProviderFee, setDatasetProviderFee] = useState<string | null>(
    null
  )
  const [algorithmProviderFee, setAlgorithmProviderFee] = useState<
    string | null
  >(null)
  const [datasetProviderFees, setDatasetProviderFees] = useState<
    ProviderFees[]
  >([])
  const [algorithmProviderFees, setAlgorithmProviderFees] =
    useState<ProviderFees | null>(null)
  const [extraFeesLoaded, setExtraFeesLoaded] = useState(false)
  const [isInitLoading, setIsInitLoading] = useState(false)
  const [initError, setInitError] = useState<string>()

  const resetInitializationState = useCallback(() => {
    setInitializedProviderResponse(undefined)
    setDatasetProviderFee(null)
    setAlgorithmProviderFee(null)
    setDatasetProviderFees([])
    setAlgorithmProviderFees(null)
    setExtraFeesLoaded(false)
    setIsInitLoading(false)
    setInitError(undefined)
  }, [])

  const initializePricingAndProvider = useCallback(
    async ({
      datasetsForProvider,
      algorithmAsset,
      algorithmService,
      algorithmAccessDetails,
      algoSessionId,
      signer,
      selectedComputeEnv,
      selectedResources,
      algoIndex,
      paymentTokenAddress,
      computeOutput,
      queueMaxWaitTime,
      algoParams,
      datasetParams,
      dockerRegistryAuth,
      accountId,
      shouldPrepareEscrow = true,
      onEscrowPrepared,
      onProgress
    }: InitializeParams): Promise<InitializeResult> => {
      setIsInitLoading(true)
      setInitError(undefined)

      try {
        const initializedProvider = await initializeProviderForComputeMulti(
          datasetsForProvider,
          algorithmAsset,
          algoSessionId,
          signer,
          selectedComputeEnv,
          selectedResources,
          algoIndex,
          paymentTokenAddress,
          computeOutput,
          queueMaxWaitTime,
          algoParams,
          datasetParams,
          dockerRegistryAuth
        )

        if (!initializedProvider) {
          throw new Error('Error initializing provider for compute job')
        }
        const datasetResponses = await Promise.all(
          datasetsForProvider.map(
            async ({ asset, service, accessDetails }, i) => {
              const datasetOrderPriceResponse = await setDatasetPrice(
                asset,
                service,
                accessDetails,
                accountId,
                signer,
                initializedProvider.datasets?.[i]?.providerFee
              )

              return {
                asset,
                service,
                accessDetails,
                datasetOrderPriceResponse
              }
            }
          )
        )
        if (shouldPrepareEscrow && selectedResources.mode === 'paid') {
          onProgress?.('escrow', 'active')
          if (!paymentTokenAddress || !web3Provider) {
            throw new Error('Missing token or provider for escrow payment')
          }
          const { payment } = initializedProvider
          const escrowAddress = ethers.getAddress(payment.escrowAddress)
          const escrow = new EscrowContract(
            escrowAddress,
            signer,
            algorithmAsset.credentialSubject.chainId
          )
          const tokenDetails = await getTokenInfo(
            paymentTokenAddress,
            web3Provider
          )
          const erc20 = new ethers.Contract(
            paymentTokenAddress,
            [
              'function approve(address spender, uint256 amount) returns (bool)',
              'function allowance(address owner, address spender) view returns (uint256)'
            ],
            signer
          )
          const prepared = await prepareEscrowPayment({
            escrow,
            erc20,
            escrowAddress,
            token: paymentTokenAddress,
            owner: await signer.getAddress(),
            payee: ethers.getAddress(payment.payee),
            amount: payment.amount,
            minLockSeconds: payment.minLockSeconds,
            decimals: tokenDetails.decimals,
            onPrepared: onEscrowPrepared
          })
          onProgress?.('escrow', prepared ? 'completed' : 'skipped')
        } else {
          onProgress?.('escrow', 'skipped')
        }

        const algoOrderPriceAndFees = await setAlgoPrice(
          algorithmAsset,
          algorithmService,
          algorithmAccessDetails,
          accountId,
          signer,
          initializedProvider.algorithm?.providerFee
        )

        setAlgorithmProviderFee(
          initializedProvider?.algorithm?.providerFee?.providerFeeAmount || '0'
        )
        setAlgorithmProviderFees(
          initializedProvider?.algorithm?.providerFee || null
        )

        const datasetFeeAmounts =
          initializedProvider?.datasets?.map(
            (ds) => ds?.providerFee?.providerFeeAmount || null
          ) || []
        const totalDatasetFee =
          datasetFeeAmounts.length > 0 &&
          datasetFeeAmounts.some((f) => f !== null)
            ? datasetFeeAmounts.reduce((acc, fee) => acc + Number(fee || 0), 0)
            : null

        setDatasetProviderFee(
          totalDatasetFee !== null ? totalDatasetFee.toString() : '0'
        )
        setDatasetProviderFees(
          (initializedProvider?.datasets
            ?.map((ds) => ds?.providerFee)
            .filter(Boolean) as ProviderFees[]) || []
        )
        setInitializedProviderResponse(initializedProvider)
        setExtraFeesLoaded(true)

        return {
          initializedProvider,
          datasetResponses,
          algoOrderPriceAndFees
        }
      } catch (error) {
        const message =
          (error as Error)?.message || 'Provider initialization failed.'
        setInitError(message)
        throw error
      } finally {
        setIsInitLoading(false)
      }
    },
    [web3Provider]
  )

  return {
    initializePricingAndProvider,
    resetInitializationState,
    initializedProviderResponse,
    datasetProviderFee,
    algorithmProviderFee,
    datasetProviderFees,
    algorithmProviderFees,
    extraFeesLoaded,
    isInitLoading,
    initError,
    setInitError
  }
}
