import {
  useContext,
  useState,
  useEffect,
  createContext,
  ReactElement,
  useCallback,
  ReactNode
} from 'react'
import { Config, LoggerInstance, Purgatory, Service } from '@oceanprotocol/lib'
import { CancelToken } from 'axios'
import { getAsset } from '@utils/aquarius'
import { useCancelToken } from '@hooks/useCancelToken'
import { getOceanConfig, sanitizeDevelopmentConfig } from '@utils/ocean'
import { getAccessDetails } from '@utils/accessDetailsAndPricing'
import { useIsMounted } from '@hooks/useIsMounted'
import { useMarketMetadata } from './MarketMetadata'
import { assetStateToString } from '@utils/assetState'
import { isValidDid } from '@utils/ddo'
import { useAddressConfig } from '@hooks/useAddressConfig'
import { useAccount, useNetwork } from 'wagmi'

export interface AssetProviderValue {
  isInPurgatory: boolean
  purgatoryData: Purgatory
  asset: AssetExtended
  title: string
  owner: string
  error?: string
  isAssetNetwork: boolean
  isOwner: boolean
  oceanConfig: Config
  loading: boolean
  assetState: string
  fetchAsset: (token?: CancelToken) => Promise<void>
}

const AssetContext = createContext({} as AssetProviderValue)

function AssetProvider({
  did,
  children
}: {
  did: string
  children: ReactNode
}): ReactElement {
  const { appConfig } = useMarketMetadata()
  const { address: accountId } = useAccount()
  const { chain } = useNetwork()

  const { isDDOWhitelisted } = useAddressConfig()
  const [isInPurgatory, setIsInPurgatory] = useState(false)
  const [purgatoryData, setPurgatoryData] = useState<Purgatory>()
  const [asset, setAsset] = useState<AssetExtended>()
  const [title, setTitle] = useState<string>()
  const [owner, setOwner] = useState<string>()
  const [isOwner, setIsOwner] = useState<boolean>()
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)
  const [isAssetNetwork, setIsAssetNetwork] = useState<boolean>()
  const [oceanConfig, setOceanConfig] = useState<Config>()
  const [assetState, setAssetState] = useState<string>()

  const newCancelToken = useCancelToken()
  const isMounted = useIsMounted()

  // -----------------------------------
  // Helper: Get and set asset based on passed DID
  // -----------------------------------
  const fetchAsset = useCallback(
    async (token?: CancelToken) => {
      if (!did) return
      const isDid = isValidDid(did)

      if (!isDid) {
        setError(`The url is not for a valid DID`)
        LoggerInstance.error(`[asset] Not a valid DID`)
        return
      }

      LoggerInstance.log('[asset] Fetching asset...')
      setLoading(true)
      const asset = await getAsset(did, token)
      const isWhitelisted = isDDOWhitelisted(asset)

      if (!asset) {
        setError(
          did +
            '\n\nWe could not find an asset for this DID in the cache. If you just published a new asset, wait some seconds and refresh this page.'
        )
        LoggerInstance.error(`[asset] Failed getting asset for ${did}`, asset)
        return
      }

      if (!isWhitelisted) {
        setError(did + '\n\nThis DID can not be retrieved on this portal.')
        LoggerInstance.error(`[asset] Failed getting asset for ${did}`, asset)
        return
      }

      if (asset.nft.state === (1 | 2 | 3)) {
        setTitle(
          `This asset has been set as "${assetStateToString(
            asset.nft.state
          )}" by the publisher`
        )
        setError(did + `\n\nPublisher Address: ${asset.nft.owner}`)
        LoggerInstance.error(`[asset] Failed getting asset for ${did}`, asset)
        return
      }
      if (asset) {
        setError(undefined)
        if (!asset?.chainId || !asset?.services?.length) return

        const accessDetails = await Promise.all(
          asset.services.map((service: Service) =>
            getAccessDetails(asset.chainId, service)
          )
        )
        setAsset((prevState) => ({
          ...prevState,
          ...asset,
          accessDetails
        }))
        setTitle(asset.metadata?.name)
        setOwner(asset.nft?.owner)
        setIsInPurgatory(asset.purgatory?.state)
        setPurgatoryData(asset.purgatory)
        setAssetState(assetStateToString(asset.nft.state))
        LoggerInstance.log('[asset] Got asset', asset)
      }

      setLoading(false)
    },
    [did, accountId]
  )

  // -----------------------------------
  // Helper: Get and set asset access details
  // -----------------------------------
  const fetchAccessDetails = useCallback(async (): Promise<void> => {
    if (!asset?.chainId || !asset?.services?.length) return

    const accessDetails = await Promise.all(
      asset.services.map((service: Service) =>
        getAccessDetails(asset.chainId, service)
      )
    )

    setAsset((prevState) => ({
      ...prevState,
      accessDetails
    }))
    LoggerInstance.log(`[asset] Got access details for ${did}`, accessDetails)
  }, [asset?.chainId, asset?.services, did])

  // -----------------------------------
  // 1. Get and set asset based on passed DID
  // -----------------------------------
  useEffect(() => {
    if (!isMounted || !appConfig?.metadataCacheUri) return

    fetchAsset(newCancelToken())
  }, [appConfig?.metadataCacheUri, fetchAsset, newCancelToken, isMounted])

  // -----------------------------------
  // 2. Attach access details to asset
  // -----------------------------------
  useEffect(() => {
    if (!isMounted) return

    fetchAccessDetails()
  }, [accountId, fetchAccessDetails, isMounted])

  // -----------------------------------
  // Check user network against asset network
  // -----------------------------------
  useEffect(() => {
    if (!chain?.id || !asset?.chainId) return

    const isAssetNetwork = chain?.id === asset?.chainId
    setIsAssetNetwork(isAssetNetwork)
  }, [chain?.id, asset?.chainId])

  // -----------------------------------
  // Asset owner check against wallet user
  // -----------------------------------
  useEffect(() => {
    if (!accountId || !owner) return

    const isOwner = accountId?.toLowerCase() === owner.toLowerCase()
    setIsOwner(isOwner)
  }, [accountId, owner])

  // -----------------------------------
  // Load ocean config based on asset network
  // -----------------------------------
  useEffect(() => {
    if (!asset?.chainId) return
    const config = getOceanConfig(asset?.chainId)
    const oceanConfig = {
      ...config,

      // add local dev values
      ...(asset?.chainId === 8996 && {
        ...sanitizeDevelopmentConfig(config)
      })
    }
    setOceanConfig(oceanConfig)
  }, [asset?.chainId])

  // -----------------------------------
  // Set Asset State as a string
  // -----------------------------------
  useEffect(() => {
    if (!asset?.nft) return

    setAssetState(assetStateToString(asset.nft.state))
  }, [asset])

  return (
    <AssetContext.Provider
      value={
        {
          asset,
          did,
          title,
          owner,
          error,
          isInPurgatory,
          purgatoryData,
          loading,
          fetchAsset,
          isAssetNetwork,
          isOwner,
          oceanConfig,
          assetState
        } as AssetProviderValue
      }
    >
      {children}
    </AssetContext.Provider>
  )
}

// Helper hook to access the provider values
const useAsset = (): AssetProviderValue => useContext(AssetContext)

export { AssetProvider, useAsset, AssetContext }
export default AssetProvider
