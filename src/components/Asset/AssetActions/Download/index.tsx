import { ReactElement, useEffect, useState } from 'react'
import { Field, Form, Formik, useFormikContext } from 'formik'
import { useAccount, useChainId } from 'wagmi'
import { Signer, formatUnits } from 'ethers'
import { toast } from 'react-toastify'
import Decimal from 'decimal.js'

import {
  FileInfo,
  LoggerInstance,
  ZERO_ADDRESS,
  UserCustomParameters
} from '@oceanprotocol/lib'

import { useAsset } from '@context/Asset'
import { useSsiWallet } from '@context/SsiWallet'
import { useIsMounted } from '@hooks/useIsMounted'
import useNetworkMetadata from '@hooks/useNetworkMetadata'

import { order } from '@utils/order'
import { downloadFile } from '@utils/provider'
import { getOrderFeedback } from '@utils/feedback'
import {
  getAvailablePrice,
  getOrderPriceAndFees
} from '@utils/accessDetailsAndPricing'
import { secondsToString } from '@utils/ddo'
import { MAX_DECIMALS } from '@utils/constants'
import { checkVerifierSessionId } from '@utils/wallet/policyServer'

import Input from '@shared/FormInput'
import Button from '@shared/atoms/Button'
import Alert from '@shared/atoms/Alert'
import FormErrorGroup from '@shared/FormInput/CheckboxGroupWithErrors'
import SuccessConfetti from '@components/@shared/SuccessConfetti'
import ButtonBuy from '../ButtonBuy'
import CalculateButtonBuy from '../CalculateButtonBuy'
import { AssetActionCheckCredentials } from '../CheckCredentials'
import ConsumerParameters, {
  parseConsumerParameterValues
} from '../ConsumerParameters'
import Loader from '@shared/atoms/Loader'
import { Row } from '../Row'

import { AssetPrice } from 'src/@types/Asset'
import { Service } from 'src/@types/ddo/Service'
import { AssetExtended } from 'src/@types/AssetExtended'

import appConfig, { ipfsGateway } from 'app.config.cjs'
import styles from './index.module.css'

import { getDownloadValidationSchema } from './_validation'
import { getDefaultValues } from '../ConsumerParameters/FormConsumerParameters'
import { getTokenInfo } from '@utils/wallet'
import useBalance from '@hooks/useBalance'
import { getConsumeMarketFeeWei } from '@utils/consumeMarketFee'

export default function Download({
  accountId,
  signer,
  asset,
  service,
  accessDetails,
  serviceIndex,
  isBalanceSufficient,
  setIsBalanceSufficient,
  dtBalance,
  isAccountIdWhitelisted,
  consumableFeedback
}: {
  accountId: string
  signer: Signer
  asset: AssetExtended
  service: Service
  accessDetails: AccessDetails
  serviceIndex: number
  file: FileInfo
  isBalanceSufficient: boolean
  setIsBalanceSufficient?: (val: boolean) => void
  dtBalance: string
  isAccountIdWhitelisted: boolean
  fileIsLoading?: boolean
  consumableFeedback?: string
}): ReactElement {
  const { isConnected } = useAccount()
  const { isSupportedOceanNetwork } = useNetworkMetadata()
  const { isInPurgatory, isAssetNetwork } = useAsset()
  const isMounted = useIsMounted()
  const { balance } = useBalance()
  const chainId = useChainId()
  const [licenseLink, setLicenseLink] = useState('')
  const [isDisabled, setIsDisabled] = useState(true)
  const [hasDatatoken, setHasDatatoken] = useState(false)
  const [statusText, setStatusText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isPriceLoading, setIsPriceLoading] = useState(false)
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | undefined>(undefined)
  const [tokenInfoProviderFee, setTokenInfoProviderFee] = useState<
    TokenInfo | undefined
  >(undefined)
  const [insufficientSymbol, setInsufficientSymbol] = useState<string | null>(
    null
  )

  const [isFullPriceLoading, setIsFullPriceLoading] = useState(
    accessDetails.type !== 'free'
  )
  const [isOwned, setIsOwned] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [validOrderTx, setValidOrderTx] = useState('')
  const [justBought, setJustBought] = useState(false)

  const [orderPriceAndFees, setOrderPriceAndFees] =
    useState<OrderPriceAndFees>()
  const [retry, setRetry] = useState<boolean>(false)
  const [credentialCheckComplete, setCredentialCheckComplete] =
    useState<boolean>(false)

  const {
    verifierSessionCache,
    lookupVerifierSessionId,
    lookupVerifierSessionIdSkip
  } = useSsiWallet()

  useEffect(() => {
    const hasValidSession =
      verifierSessionCache &&
      (lookupVerifierSessionId(asset.id, service.id) ||
        lookupVerifierSessionIdSkip(asset.id, service.id))
    if (hasValidSession && !credentialCheckComplete) {
      setCredentialCheckComplete(true)
    }
  }, [
    verifierSessionCache,
    asset.id,
    service.id,
    credentialCheckComplete,
    lookupVerifierSessionId,
    lookupVerifierSessionIdSkip
  ])

  useEffect(() => {
    const fetchTokenDetails = async () => {
      if (!chainId || !signer?.provider || !accessDetails?.baseToken?.address)
        return

      const tokenDetails = await getTokenInfo(
        accessDetails?.baseToken?.address,
        signer.provider
      )
      setTokenInfo(tokenDetails)
    }

    fetchTokenDetails()
  }, [chainId, signer, accessDetails])

  useEffect(() => {
    const fetchTokenDetailsProviderFee = async () => {
      if (!chainId || !signer?.provider) return
      const tokenDetails = await getTokenInfo(
        orderPriceAndFees?.providerFee?.providerFeeToken,
        signer.provider
      )
      setTokenInfoProviderFee(tokenDetails)
    }
    if (
      orderPriceAndFees?.providerFee?.providerFeeAmount &&
      orderPriceAndFees?.providerFee?.providerFeeToken
    ) {
      fetchTokenDetailsProviderFee()
    }
  }, [chainId, signer, orderPriceAndFees])

  useEffect(() => {
    const licenseMirrors =
      asset?.credentialSubject?.metadata?.license?.licenseDocuments[0]
        ?.mirrors || []
    let license = ''

    if (licenseMirrors.length > 0) {
      const firstMirror = licenseMirrors[0]
      if (firstMirror.type === 'ipfs' && firstMirror.ipfsCid) {
        license = `${ipfsGateway}/${firstMirror.ipfsCid}`
      } else if (firstMirror.url) {
        license = firstMirror.url
      }
      setLicenseLink(license)
    }
  }, [asset])

  const price: AssetPrice = getAvailablePrice(accessDetails)
  const isUnsupportedPricing =
    accessDetails.type === 'NOT_SUPPORTED' ||
    (accessDetails.type === 'fixed' && !accessDetails.baseToken?.symbol)

  useEffect(() => {
    if (asset?.indexedMetadata?.event?.from === accountId) {
      setIsOwner(true)
    }
  }, [asset, accountId])

  useEffect(() => {
    if (isUnsupportedPricing) return
    setIsOwned(accessDetails.isOwned || false)
    setValidOrderTx(accessDetails.validOrderTx || '')

    async function init() {
      if (accessDetails.addressOrId === ZERO_ADDRESS) return

      try {
        !orderPriceAndFees && setIsPriceLoading(true)
        const _orderPriceAndFees = await getOrderPriceAndFees(
          asset,
          service,
          accessDetails,
          accountId || ZERO_ADDRESS
        )
        setOrderPriceAndFees(_orderPriceAndFees)
        !orderPriceAndFees && setIsPriceLoading(false)
      } catch (error) {
        LoggerInstance.error('getOrderPriceAndFees', error)
        setIsPriceLoading(false)
      }
    }

    if (!orderPriceAndFees) init()
  }, [
    accessDetails,
    accountId,
    asset,
    isUnsupportedPricing,
    orderPriceAndFees,
    service
  ])

  useEffect(() => {
    setHasDatatoken(Number(dtBalance) >= 1)
  }, [dtBalance])

  useEffect(() => {
    if (
      (accessDetails.type === 'fixed' && !orderPriceAndFees) ||
      !isMounted ||
      !accountId ||
      isUnsupportedPricing
    )
      return

    const isDisabled =
      !accessDetails.isPurchasable ||
      !isAssetNetwork ||
      ((!isBalanceSufficient || !isAssetNetwork) &&
        !isOwned &&
        !hasDatatoken) ||
      !isAccountIdWhitelisted
    setIsDisabled(isDisabled)
  }, [
    isMounted,
    isBalanceSufficient,
    isAssetNetwork,
    hasDatatoken,
    accountId,
    isOwned,
    isUnsupportedPricing,
    orderPriceAndFees,
    isAccountIdWhitelisted,
    accessDetails
  ])

  async function handleOrderOrDownload(dataParams?: UserCustomParameters) {
    setIsLoading(true)
    setRetry(false)
    try {
      if (isOwned) {
        setStatusText(
          getOrderFeedback(
            accessDetails.baseToken?.symbol,
            accessDetails.datatoken?.symbol
          )[3]
        )

        await downloadFile(
          signer,
          asset,
          service,
          accessDetails,
          accountId,
          lookupVerifierSessionId(asset.id, service.id) ||
            lookupVerifierSessionIdSkip(asset.id, service.id),
          validOrderTx,
          dataParams
        )
      } else {
        setStatusText(
          getOrderFeedback(
            accessDetails.baseToken?.symbol,
            accessDetails.datatoken?.symbol
          )[accessDetails.type === 'fixed' ? 2 : 1]
        )
        const orderTx = await order(
          signer,
          asset,
          service,
          accessDetails,
          orderPriceAndFees,
          accountId,
          hasDatatoken
        )
        const tx = await orderTx.wait()
        if (!tx) {
          throw new Error()
        }
        setIsOwned(true)
        setValidOrderTx(tx.hash)
        setJustBought(true)
      }
    } catch (error) {
      LoggerInstance.error(error)
      setRetry(true)
      if (
        error?.message?.includes('user rejected transaction') ||
        error?.message?.includes('User denied') ||
        error?.message?.includes('MetaMask Tx Signature: User denied')
      ) {
        toast.info('Transaction was cancelled by user')
        return
      }

      const message = isOwned
        ? 'Failed to download file!'
        : 'An error occurred, please retry. Check console for more information.'
      toast.error(message)
    }
    setIsLoading(false)
  }

  async function handleFormSubmit(values: any) {
    try {
      const skip = lookupVerifierSessionIdSkip(asset.id, service.id)
      if (appConfig.ssiEnabled && !skip) {
        const result = await checkVerifierSessionId(
          lookupVerifierSessionId(asset.id, service.id)
        )
        if (!result.success) {
          toast.error('Invalid session')
          return
        }
      }
      const dataServiceParams = parseConsumerParameterValues(
        values?.datasetParams_0 || values.dataServiceParams,
        service.consumerParameters
      )
      await handleOrderOrDownload(dataServiceParams)
    } catch (error) {
      toast.error(error.message)
      LoggerInstance.error(error)
    }
  }

  const handleFullPrice = () => {
    setIsFullPriceLoading(false)
  }

  const CalculateButton = () => (
    <CalculateButtonBuy
      type="submit"
      onClick={handleFullPrice}
      stepText={statusText}
      isLoading={isLoading}
    />
  )

  const PurchaseButton = ({ isValid }: { isValid?: boolean }) => {
    return (
      <ButtonBuy
        action="download"
        disabled={
          !isValid || !isBalanceSufficient || (isOwned ? !isValid : false)
        }
        hasPreviousOrder={isOwned}
        hasDatatoken={hasDatatoken}
        btSymbol={accessDetails.baseToken?.symbol}
        dtSymbol={asset.indexedMetadata?.stats[serviceIndex]?.symbol}
        dtBalance={dtBalance}
        type="submit"
        assetTimeout={secondsToString(service.timeout)}
        assetType={asset.credentialSubject?.metadata?.type}
        stepText={statusText}
        isLoading={isLoading}
        priceType={accessDetails.type}
        isConsumable={accessDetails.isPurchasable}
        isBalanceSufficient={isBalanceSufficient}
        insufficientSymbol={insufficientSymbol}
        consumableFeedback={consumableFeedback}
        retry={retry}
        isSupportedOceanNetwork={isSupportedOceanNetwork}
        isAccountConnected={isConnected}
      />
    )
  }

  const AssetActionBuy = () => {
    const { isValid } = useFormikContext()

    const baseTokenDecimals =
      accessDetails.baseToken?.decimals || tokenInfo?.decimals || 18
    const activeFeeWei = getConsumeMarketFeeWei({
      chainId: asset.credentialSubject.chainId,
      baseTokenAddress: accessDetails.baseToken.address,
      baseTokenDecimals,
      price: orderPriceAndFees?.price || price.value || 0
    }).totalFeeWei
    // 1. Calculate Base Token (EURC/OCEAN) requirements
    const totalBaseTokenNeeded = new Decimal(
      new Decimal(
        Number(orderPriceAndFees?.price) || price.value || 0
      ).toDecimalPlaces(MAX_DECIMALS)
    )
      .add(new Decimal(orderPriceAndFees?.opcFee || 0))
      .add(new Decimal(formatUnits(activeFeeWei, baseTokenDecimals)))

    // 2. Calculate Provider Token requirements
    const totalProviderTokenNeeded = new Decimal(
      formatUnits(
        orderPriceAndFees?.providerFee?.providerFeeAmount || 0,
        tokenInfoProviderFee?.decimals || 18
      )
    )

    // 3. Determine if tokens are the same
    const areTokensSame =
      price.tokenSymbol === tokenInfoProviderFee?.symbol ||
      accessDetails?.baseToken?.address?.toLowerCase() ===
        orderPriceAndFees?.providerFee?.providerFeeToken?.toLowerCase()

    // 4. Balance check logic
    const userBaseBalance = new Decimal(
      balance?.approved?.[price.tokenSymbol?.toLowerCase()] || 0
    )
    const userProviderBalance = new Decimal(
      balance?.approved?.[tokenInfoProviderFee?.symbol?.toLowerCase()] || 0
    )

    const sufficient = areTokensSame
      ? userBaseBalance.greaterThanOrEqualTo(
          totalBaseTokenNeeded.add(totalProviderTokenNeeded)
        )
      : userBaseBalance.greaterThanOrEqualTo(totalBaseTokenNeeded) &&
        userProviderBalance.greaterThanOrEqualTo(totalProviderTokenNeeded)

    useEffect(() => {
      if (!orderPriceAndFees) return
      setIsBalanceSufficient(sufficient)
      setInsufficientSymbol(null)

      if (sufficient) return

      if (areTokensSame) {
        setInsufficientSymbol(price.tokenSymbol)
        return
      }
      if (!userBaseBalance.greaterThanOrEqualTo(totalBaseTokenNeeded)) {
        setInsufficientSymbol(price.tokenSymbol)
        return
      }
      if (!userProviderBalance.greaterThanOrEqualTo(totalProviderTokenNeeded)) {
        setInsufficientSymbol(tokenInfoProviderFee?.symbol || null)
      }
    }, [
      sufficient,
      orderPriceAndFees,
      areTokensSame,
      userBaseBalance,
      userProviderBalance,
      totalBaseTokenNeeded,
      totalProviderTokenNeeded,
      price.tokenSymbol,
      tokenInfoProviderFee?.symbol
    ])

    if (!orderPriceAndFees) return null

    return (
      <div style={{ textAlign: 'left', marginTop: '2%' }}>
        {!isPriceLoading &&
          !isOwned &&
          new Decimal(price.value || 0).greaterThan(0) && (
            <div className={styles.calculation}>
              <Row
                hasDatatoken={hasDatatoken}
                price={new Decimal(
                  Number(orderPriceAndFees?.price) || price.value || 0
                )
                  .toDecimalPlaces(MAX_DECIMALS)
                  .toString()}
                symbol={price.tokenSymbol}
                type="DATASET"
              />
              <Row
                price={orderPriceAndFees?.opcFee || '0'}
                symbol={price.tokenSymbol}
                type={`OEC FEE (${(
                  (parseFloat(orderPriceAndFees.opcFee) /
                    parseFloat(orderPriceAndFees.price)) *
                  100
                ).toFixed(1)}%)`}
              />
              <Row
                price={
                  formatUnits(
                    orderPriceAndFees?.providerFee?.providerFeeAmount,
                    tokenInfoProviderFee?.decimals
                  ) || '0'
                }
                symbol={tokenInfoProviderFee?.symbol}
                type="PROVIDER FEE"
              />
              <Row
                price={formatUnits(activeFeeWei, tokenInfo?.decimals) || '0'}
                symbol={price.tokenSymbol}
                type="CONSUME MARKET FEE"
              />

              <div className={styles.totalWrapper}>
                {areTokensSame ? (
                  <>
                    <span className={styles.amountMain}>
                      {totalBaseTokenNeeded
                        .add(totalProviderTokenNeeded)
                        .toString()}
                    </span>
                    <span className={styles.symbolMain}>
                      {price.tokenSymbol}
                    </span>
                  </>
                ) : (
                  <>
                    <span className={styles.amountMain}>
                      {totalBaseTokenNeeded.toString()}
                    </span>
                    <span className={styles.symbolMain}>
                      {price.tokenSymbol}
                    </span>
                    <span className={styles.ampersand}>&</span>
                    <span className={styles.amountMain}>
                      {totalProviderTokenNeeded.toString()}
                    </span>
                    <span className={styles.symbolMain}>
                      {tokenInfoProviderFee?.symbol}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

        <FormErrorGroup
          errorFields={['termsAndConditions', 'acceptPublishingLicense']}
        >
          <Field
            component={Input}
            name="termsAndConditions"
            type="checkbox"
            options={['Terms and Conditions']}
            prefixes={['I agree to the']}
            actions={['/terms']}
            disabled={isLoading}
            hideLabel={true}
          />
          <Field
            component={Input}
            name="acceptPublishingLicense"
            type="checkbox"
            options={['License Terms']}
            prefixes={['I agree to the ']}
            postfixes={[' under which this asset was made available']}
            actions={[licenseLink]}
            disabled={isLoading}
            hideLabel={true}
          />
        </FormErrorGroup>

        <div className={styles.buttonContainer}>
          {!isInPurgatory && <PurchaseButton isValid={isValid} />}
        </div>
      </div>
    )
  }

  return (
    <Formik
      initialValues={{
        dataServiceParams: getDefaultValues(service.consumerParameters)
      }}
      initialTouched={{
        dataServiceParams: Object.fromEntries(
          (service.consumerParameters || [])
            .filter(
              (p) =>
                p?.required === true &&
                (p?.default === undefined ||
                  p?.default === null ||
                  (typeof p?.default === 'string' && p?.default.trim() === ''))
            )
            .map((p) => [p.name as string, true])
        )
      }}
      validateOnMount
      validationSchema={getDownloadValidationSchema(service.consumerParameters)}
      onSubmit={(values) => {
        if (
          !(
            lookupVerifierSessionId(asset.id, service.id) ||
            lookupVerifierSessionIdSkip(asset.id, service.id)
          ) &&
          appConfig.ssiEnabled
        ) {
          return
        }
        handleFormSubmit(values)
      }}
    >
      <Form>
        {(() => {
          function getLocalSessionImmediate(
            did: string,
            svcId: string
          ): string {
            try {
              if (typeof window === 'undefined') return ''
              const storage = localStorage.getItem('verifierSessionId')
              const sessions = storage ? JSON.parse(storage) : {}
              return (
                sessions?.[`${did}_${svcId}`] ||
                sessions?.[`${did}_${svcId}_skip`] ||
                ''
              )
            } catch {
              return ''
            }
          }
          const sessionId =
            lookupVerifierSessionId(asset.id, service.id) ||
            lookupVerifierSessionIdSkip(asset.id, service.id)
          const localSession = getLocalSessionImmediate(asset.id, service.id)
          const hasSession = Boolean(
            sessionId || localSession || credentialCheckComplete
          )
          const canRenderConsume = !appConfig.ssiEnabled || hasSession

          if (!canRenderConsume) {
            return (
              <aside className={styles.consume}>
                <AssetActionCheckCredentials asset={asset} service={service} />
                {credentialCheckComplete && (
                  <div style={{ marginTop: '10px', textAlign: 'center' }}>
                    <Button
                      type="button"
                      style="primary"
                      size="small"
                      onClick={() => window.location.reload()}
                    >
                      Refresh to Show Download Button
                    </Button>
                  </div>
                )}
              </aside>
            )
          }

          return (
            <aside
              className={`${styles.consume} ${
                appConfig.ssiEnabled && hasSession ? styles.tighterStack : ''
              }`}
            >
              {!isOwner &&
                (isFullPriceLoading ? (
                  <>
                    <div className={styles.noMarginAlert}>
                      <Alert
                        state="success"
                        text="SSI credential verification passed"
                      />
                    </div>
                    <CalculateButton />
                  </>
                ) : (
                  <>
                    {isPriceLoading && (
                      <div className={styles.noMarginAlert}>
                        <Loader
                          message="Calculating price..."
                          variant="primary"
                        />
                      </div>
                    )}
                    {accessDetails.type === 'free' && (
                      <div className={styles.noMarginAlert}>
                        <Alert
                          state="info"
                          text={
                            parseFloat(
                              formatUnits(
                                orderPriceAndFees?.providerFee
                                  ?.providerFeeAmount || '0',
                                tokenInfo?.decimals
                              )
                            ) > 0
                              ? `This dataset is free to use. Please note that a provider fee of ${formatUnits(
                                  orderPriceAndFees?.providerFee
                                    ?.providerFeeAmount || '0',
                                  tokenInfoProviderFee?.decimals
                                )} ${
                                  tokenInfoProviderFee?.symbol
                                } applies, as well as possible network gas fees.`
                              : `This dataset is free to use. Please note that network gas fees still apply, even when using free assets.`
                          }
                        />
                      </div>
                    )}
                    {justBought && (
                      <div>
                        <SuccessConfetti
                          success={`You successfully bought this ${asset.credentialSubject?.metadata?.type} and are now able to download it.`}
                        />
                      </div>
                    )}
                    {isOwned &&
                      Array.isArray(service.consumerParameters) &&
                      service.consumerParameters.length > 0 && (
                        <div className={styles.consumerParameters}>
                          <ConsumerParameters
                            services={[service]}
                            isLoading={isLoading}
                            mode="flat"
                            flatServiceIndex={0}
                            nameOverride="dataServiceParams"
                          />
                        </div>
                      )}
                    <AssetActionBuy />
                  </>
                ))}
            </aside>
          )
        })()}
      </Form>
    </Formik>
  )
}
