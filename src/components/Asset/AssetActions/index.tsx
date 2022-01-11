import React, { ReactElement, useState, useEffect } from 'react'
import Compute from './Compute'
import Consume from './Consume'
import { LoggerInstance } from '@oceanprotocol/lib'
import Tabs, { TabsItem } from '@shared/atoms/Tabs'
import { compareAsBN } from '@utils/numbers'
import Pool from './Pool'
import Trade from './Trade'
import { useAsset } from '@context/Asset'
import { useOcean } from '@context/Ocean'
import { useWeb3 } from '@context/Web3'
import Web3Feedback from '@shared/Web3Feedback'
import { FileMetadata, getFileInfo } from '@utils/provider'
import { getOceanConfig } from '@utils/ocean'
import { useCancelToken } from '@hooks/useCancelToken'
import { useIsMounted } from '@hooks/useIsMounted'
import styles from './index.module.css'
import { useFormikContext } from 'formik'
import { FormPublishData } from 'src/components/Publish/_types'

export default function AssetActions({
  ddo,
  price
}: {
  ddo: Asset
  price: BestPrice
}): ReactElement {
  const { accountId, balance } = useWeb3()
  const { isAssetNetwork } = useAsset()
  const { values } = useFormikContext<FormPublishData>()

  const [isBalanceSufficient, setIsBalanceSufficient] = useState<boolean>()
  const [dtBalance, setDtBalance] = useState<string>()
  const [fileMetadata, setFileMetadata] = useState<FileMetadata>()
  const [fileIsLoading, setFileIsLoading] = useState<boolean>(false)
  const isCompute = Boolean(
    ddo?.services.filter((service) => service.type === 'compute')[0]
  )

  const [isConsumable, setIsConsumable] = useState<boolean>(true)
  const [consumableFeedback, setConsumableFeedback] = useState<string>('')
  const newCancelToken = useCancelToken()
  const isMounted = useIsMounted()

  // useEffect(() => {
  //   if (!ddo || !accountId || !ocean || !isAssetNetwork) return

  //   async function checkIsConsumable() {
  //     const consumable = await ocean.assets.isConsumable(
  //       ddo,
  //       accountId.toLowerCase()
  //     )
  //     if (consumable) {
  //       setIsConsumable(consumable.result)
  //       setConsumableFeedback(consumable.message)
  //     }
  //   }
  //   checkIsConsumable()
  // }, [accountId, isAssetNetwork, ddo, ocean])

  useEffect(() => {
    const oceanConfig = getOceanConfig(ddo?.chainId)
    if (!oceanConfig) return

    async function initFileInfo() {
      setFileIsLoading(true)

      const asset = values?.services?.[0].files?.[0].url || ddo.id
      const providerUrl =
        values?.services[0].providerUrl || oceanConfig.providerUri

      try {
        const fileInfoResponse = await getFileInfo(
          asset,
          oceanConfig.providerUri,
          newCancelToken()
        )
        fileInfoResponse && setFileMetadata(fileInfoResponse[0])
        setFileIsLoading(false)
      } catch (error) {
        LoggerInstance.error(error.message)
      }
    }
    initFileInfo()
  }, [ddo, isMounted, newCancelToken, values?.services])

  // Get and set user DT balance
  useEffect(() => {
    if (!accountId || !isAssetNetwork) return
    async function init() {
      try {
        // const dtBalance = await ocean.datatokens.balance(
        //   ddo.services[0].datatokenAddress,
        //   accountId
        // )
        // setDtBalance(dtBalance)
      } catch (e) {
        LoggerInstance.error(e.message)
      }
    }
    init()
  }, [accountId, ddo, isAssetNetwork])

  // Check user balance against price
  useEffect(() => {
    if (price?.type === 'free') setIsBalanceSufficient(true)
    if (!price?.value || !accountId || !balance?.ocean || !dtBalance) return

    setIsBalanceSufficient(
      compareAsBN(balance.ocean, `${price.value}`) || Number(dtBalance) >= 1
    )

    return () => {
      setIsBalanceSufficient(false)
    }
  }, [balance, accountId, price, dtBalance])

  const UseContent = isCompute ? (
    <Compute
      ddo={ddo}
      price={price}
      dtBalance={dtBalance}
      file={fileMetadata}
      fileIsLoading={fileIsLoading}
      isConsumable={isConsumable}
      consumableFeedback={consumableFeedback}
    />
  ) : (
    <Consume
      ddo={ddo}
      price={price}
      dtBalance={dtBalance}
      isBalanceSufficient={isBalanceSufficient}
      file={fileMetadata}
      fileIsLoading={fileIsLoading}
      isConsumable={isConsumable}
      consumableFeedback={consumableFeedback}
    />
  )

  const tabs: TabsItem[] = [
    {
      title: 'Use',
      content: UseContent
    }
  ]

  price?.type === 'dynamic' &&
    tabs.push(
      {
        title: 'Pool',
        content: <Pool />,
        disabled: !price.datatoken
      },
      {
        title: 'Trade',
        content: <Trade />,
        disabled: !price.datatoken
      }
    )

  return (
    <>
      <Tabs items={tabs} className={styles.actions} />
      <Web3Feedback isAssetNetwork={isAssetNetwork} />
    </>
  )
}