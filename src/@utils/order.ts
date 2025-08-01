import {
  approve,
  approveWei,
  Datatoken,
  Dispenser,
  FixedRateExchange,
  FreOrderParams,
  LoggerInstance,
  OrderParams,
  ProviderComputeInitialize,
  ProviderFees,
  ProviderInstance,
  ProviderInitialize,
  getErrorMessage,
  ZERO_ADDRESS
} from '@oceanprotocol/lib'
import { Signer, ethers } from 'ethers'
import { getOceanConfig } from './ocean'
import {
  marketFeeAddress,
  consumeMarketOrderFee,
  consumeMarketFixedSwapFee,
  customProviderUrl
} from '../../app.config.cjs'
import { toast } from 'react-toastify'
import { Service } from 'src/@types/ddo/Service'
import { AssetExtended } from 'src/@types/AssetExtended'

async function initializeProvider(
  asset: AssetExtended,
  service: Service,
  accountId: string,
  providerFees?: ProviderFees
): Promise<ProviderInitialize> {
  if (providerFees) return
  try {
    const command = {
      documentId: asset.id,
      serviceId: service.id,
      consumerAddress: accountId,
      policyServer: {
        sessionId: '',
        successRedirectUri: '',
        errorRedirectUri: '',
        responseRedirectUri: '',
        presentationDefinitionUri: ''
      }
    }
    const initializePs = await ProviderInstance.initializePSVerification(
      customProviderUrl || service.serviceEndpoint,
      command
    )
    if (initializePs?.success) {
      const provider = await ProviderInstance.initialize(
        asset.id,
        service.id,
        0,
        accountId,
        customProviderUrl || service.serviceEndpoint
      )
      return provider
    }
    throw new Error(`Provider initialization failed: ${initializePs.error}`)
  } catch (error) {
    const message = getErrorMessage(error.message)
    LoggerInstance.log('[Initialize Provider] Error:', message)
    toast.error(message)
  }
}

/**
 * @param signer
 * @param asset
 * @param orderPriceAndFees
 * @param accountId
 * @param providerFees
 * @param computeConsumerAddress
 * @returns {ethers.providers.TransactionResponse | BigNumber} receipt of the order
 */
export async function order(
  signer: Signer,
  asset: AssetExtended,
  service: Service,
  accessDetails: AccessDetails,
  orderPriceAndFees: OrderPriceAndFees,
  accountId: string,
  hasDatatoken: boolean,
  providerFees?: ProviderFees,
  computeConsumerAddress?: string
): Promise<ethers.providers.TransactionResponse> {
  const datatoken = new Datatoken(signer, asset.credentialSubject?.chainId)
  const config = getOceanConfig(asset.credentialSubject?.chainId)
  const initializeData = await initializeProvider(
    asset,
    service,
    accountId,
    providerFees
  )
  const serviceIndex = asset.credentialSubject?.services.findIndex(
    (s: Service) => s.id === service.id
  )
  if (serviceIndex === -1) {
    throw new Error(`Service with id ${service.id} not found in the DDO.`)
  }
  const orderParams = {
    consumer: computeConsumerAddress || accountId,
    serviceIndex,
    _providerFee: providerFees || initializeData.providerFee,
    _consumeMarketFee: {
      consumeMarketFeeAddress: marketFeeAddress,
      consumeMarketFeeAmount: consumeMarketOrderFee,
      consumeMarketFeeToken:
        accessDetails.baseToken?.address ||
        '0x0000000000000000000000000000000000000000'
    }
  } as OrderParams
  switch (accessDetails.type) {
    case 'fixed': {
      // this assumes all fees are in ocean
      const freParams = {
        exchangeContract: config.fixedRateExchangeAddress,
        exchangeId: accessDetails.addressOrId,
        maxBaseTokenAmount: orderPriceAndFees?.price,
        baseTokenAddress: accessDetails.baseToken?.address,
        baseTokenDecimals: accessDetails.baseToken?.decimals || 18,
        swapMarketFee: consumeMarketFixedSwapFee,
        marketFeeAddress
      } as FreOrderParams
      if (accessDetails.templateId === 1) {
        if (!hasDatatoken) {
          // buy datatoken
          const tx: any = await approve(
            signer,
            config,
            await signer.getAddress(),
            accessDetails.baseToken.address,
            config.fixedRateExchangeAddress,
            orderPriceAndFees?.price,
            false
          )
          const txApprove = typeof tx !== 'number' ? await tx.wait() : tx
          if (!txApprove) {
            return
          }
          const fre = new FixedRateExchange(
            config.fixedRateExchangeAddress,
            signer
          )
          const consumeMarketFee = (
            (parseFloat(orderPriceAndFees?.price) *
              parseFloat(consumeMarketFixedSwapFee)) /
            100
          ).toFixed(2)

          const freTx = await fre.buyDatatokens(
            accessDetails.addressOrId,
            '1',
            orderPriceAndFees?.price,
            marketFeeAddress,
            '0'
          )
          const buyDtTx = await freTx.wait()
        }
        return await datatoken.startOrder(
          accessDetails.datatoken.address,
          orderParams.consumer,
          orderParams.serviceIndex,
          orderParams._providerFee,
          orderParams._consumeMarketFee
        )
      }
      if (accessDetails.templateId === 2) {
        freParams.maxBaseTokenAmount = (
          Number(freParams.maxBaseTokenAmount) +
          (Number(freParams.maxBaseTokenAmount) +
            Number(orderPriceAndFees?.opcFee))
        ).toString()
        const tx: any = await approve(
          signer,
          config,
          accountId,
          accessDetails.baseToken.address,
          accessDetails.datatoken.address,
          (
            Number(orderPriceAndFees?.price) + Number(orderPriceAndFees?.opcFee)
          ).toString(),
          false
        )
        const txApprove = typeof tx !== 'number' ? await tx.wait() : tx
        if (!txApprove) {
          return
        }
        const buyTx = await datatoken.buyFromFreAndOrder(
          accessDetails.datatoken.address,
          orderParams,
          freParams
        )
        return buyTx
      }
      break
    }
    case 'free': {
      if (accessDetails.templateId === 1) {
        const dispenser = new Dispenser(config.dispenserAddress, signer)
        const dispenserTx = await dispenser.dispense(
          accessDetails.datatoken.address,
          '1',
          accountId
        )
        return await datatoken.startOrder(
          accessDetails.datatoken.address,
          orderParams.consumer,
          orderParams.serviceIndex,
          orderParams._providerFee,
          orderParams._consumeMarketFee
        )
      }
      if (accessDetails.templateId === 2) {
        return await datatoken.buyFromDispenserAndOrder(
          service.datatokenAddress,
          orderParams,
          config.dispenserAddress
        )
      }
    }
  }
}

/**
 * called when having a valid order, but with expired provider access, requires approval of the provider fee
 * @param signer
 * @param asset
 * @param accountId
 * @param validOrderTx
 * @param providerFees
 * @returns {TransactionReceipt} receipt of the order
 */
export async function reuseOrder(
  signer: Signer,
  asset: AssetExtended,
  service: Service,
  accessDetails: AccessDetails,
  accountId: string,
  validOrderTx: string,
  providerFees?: ProviderFees
): Promise<ethers.providers.TransactionResponse> {
  const datatoken = new Datatoken(signer)
  const initializeData = await initializeProvider(
    asset,
    service,
    accountId,
    providerFees
  )

  const tx = await datatoken.reuseOrder(
    accessDetails.datatoken.address,
    validOrderTx,
    providerFees || initializeData.providerFee
  )

  return tx
}

async function approveProviderFee(
  asset: AssetExtended,
  accessDetails: AccessDetails,
  accountId: string,
  signer: Signer,
  providerFeeAmount: string
): Promise<ethers.providers.TransactionResponse> {
  const config = getOceanConfig(asset.credentialSubject?.chainId)
  const baseToken =
    accessDetails.type === 'free'
      ? getOceanConfig(asset.credentialSubject?.chainId).oceanTokenAddress
      : accessDetails.baseToken?.address
  const txApproveWei = await approveWei(
    signer,
    config,
    accountId,
    baseToken,
    accessDetails.datatoken?.address,
    providerFeeAmount
  )
  return txApproveWei
}

/**
 * Handles order for compute assets for the following scenarios:
 * - have validOrder and no providerFees -> then order is valid, providerFees are valid, it returns the valid order value
 * - have validOrder and providerFees -> then order is valid but providerFees are not valid, we need to call reuseOrder and pay only providerFees
 * - no validOrder -> we need to call order, to pay 1 DT & providerFees
 * @param signer
 * @param asset
 * @param orderPriceAndFees
 * @param accountId
 * @param hasDatatoken
 * @param initializeData
 * @param computeConsumerAddress
 * @returns {Promise<string>} tx id
 */
export async function handleComputeOrder(
  signer: Signer,
  asset: AssetExtended,
  service: Service,
  accessDetails: AccessDetails,
  orderPriceAndFees: OrderPriceAndFees,
  accountId: string,
  initializeData: ProviderComputeInitialize,
  hasDatatoken,
  verifierSessionId: string,
  computeConsumerAddress?: string
): Promise<string> {
  LoggerInstance.log(
    '[compute] Handle compute order for asset type: ',
    asset.credentialSubject?.metadata?.type
  )
  LoggerInstance.log('[compute] Using initializeData: ', initializeData)
  try {
    // Return early when valid order is found, and no provider fees
    // are to be paid
    if (accessDetails.validOrderTx) {
      return accessDetails.validOrderTx
    }
    if (initializeData?.validOrder && !initializeData.providerFee) {
      LoggerInstance.log(
        '[compute] Has valid order: ',
        initializeData.validOrder
      )
      return accessDetails.validOrderTx
    }

    // Approve potential Provider fee amount first
    if (initializeData?.providerFee?.providerFeeAmount !== '0') {
      const txApproveProvider = await approveProviderFee(
        asset,
        accessDetails,
        accountId,
        signer,
        initializeData.providerFee.providerFeeAmount
      )

      if (!txApproveProvider)
        throw new Error('Failed to approve provider fees!')

      LoggerInstance.log('[compute] Approved provider fees:', txApproveProvider)
    }

    if (initializeData?.validOrder) {
      LoggerInstance.log('[compute] Calling reuseOrder ...', initializeData)
      const txReuseOrder = await reuseOrder(
        signer,
        asset,
        service,
        accessDetails,
        accountId,
        initializeData.validOrder,
        initializeData.providerFee
      )
      if (!txReuseOrder) throw new Error('Failed to reuse order!')
      const tx = await txReuseOrder.wait()
      LoggerInstance.log('[compute] Reused order:', tx)
      return tx?.transactionHash
    }

    LoggerInstance.log(
      '[compute] Calling order ...',
      initializeData,
      orderPriceAndFees,
      asset,
      service
    )
    const txStartOrder = await order(
      signer,
      asset,
      service,
      accessDetails,
      orderPriceAndFees,
      accountId,
      hasDatatoken,
      initializeData.providerFee,
      computeConsumerAddress
    )

    const tx = await txStartOrder.wait()
    LoggerInstance.log('[compute] Order succeeded', tx)
    return tx?.transactionHash
  } catch (error) {
    toast.error(error.message)
    LoggerInstance.error(`[compute] ${error.message}`)
  }
}
