import {
  ChangeEvent,
  ReactElement,
  useCallback,
  useEffect,
  useState
} from 'react'
import { toast } from 'react-toastify'
import { LoggerInstance } from '@oceanprotocol/lib'
import { useAccount } from 'wagmi'
import appConfig from 'app.config.cjs'
import Modal from '@shared/atoms/Modal'
import Button from '@components/@shared/atoms/Button'
import Loader from '@components/@shared/atoms/Loader'
import ConnectedIcon from '@images/connected.svg'
import DisconnectedIcon from '@images/disconnected.svg'
import { useSsiWallet } from '@context/SsiWallet'
import { useEthersSigner } from '@hooks/useEthersSigner'
import useSsiChainGuard from '@hooks/useSsiChainGuard'
import {
  connectToWallet,
  getSsiVerifiableCredentialType,
  getSsiWalletApi,
  getWalletDids,
  getWalletKeys,
  getWallets,
  isSessionValid
} from '@utils/wallet/ssiWallet'
import { SsiKeyDesc, SsiWalletDesc, SsiWalletDid } from 'src/@types/SsiWallet'

interface SsiWalletControlProps {
  styles: Record<string, string>
  walletRequiredMessage: string
  showConnectedToast?: boolean
}

function getKeyLabel(key: SsiKeyDesc): string {
  const keyWithName = key as unknown as {
    name?: string
    keyId: { id: string }
  }

  return keyWithName?.name || key.keyId.id
}

export default function SsiWalletControl({
  styles,
  walletRequiredMessage,
  showConnectedToast = false
}: SsiWalletControlProps): ReactElement {
  const {
    sessionToken,
    setSessionToken,
    selectedWallet,
    setSelectedWallet,
    selectedKey,
    setSelectedKey,
    selectedDid,
    setSelectedDid,
    cachedCredentials,
    ssiWalletCache,
    setCachedCredentials,
    clearVerifierSessionCache,
    isSsiSessionHydrating
  } = useSsiWallet()
  const { isConnected } = useAccount()
  const walletClient = useEthersSigner()
  const { ensureAllowedChainForSsi } = useSsiChainGuard()

  const [ssiWallets, setSsiWallets] = useState<SsiWalletDesc[]>([])
  const [ssiKeys, setSsiKeys] = useState<SsiKeyDesc[]>([])
  const [walletDids, setWalletDids] = useState<SsiWalletDid[]>([])
  const [showDialog, setShowDialog] = useState(false)
  const [isLoadingSsiData, setIsLoadingSsiData] = useState(false)
  const safeCachedCredentials = Array.isArray(cachedCredentials)
    ? cachedCredentials
    : []

  const isSsiBusy = isLoadingSsiData || isSsiSessionHydrating
  const isConnectedWithSession = Boolean(
    sessionToken && isConnected && walletClient
  )

  const fetchWallets = useCallback(
    async (activeSession = sessionToken) => {
      if (!activeSession) return selectedWallet

      try {
        const wallets = await getWallets(activeSession.token)
        const resolvedWallet = selectedWallet || wallets[0]
        setSelectedWallet(resolvedWallet)
        setSsiWallets(wallets)
        return resolvedWallet
      } catch (error) {
        setSessionToken(undefined)
        LoggerInstance.error(error)
        return selectedWallet
      }
    },
    [selectedWallet, sessionToken, setSelectedWallet, setSessionToken]
  )

  const fetchDids = useCallback(
    async (wallet = selectedWallet, activeSession = sessionToken) => {
      if (!wallet || !activeSession) return

      try {
        const dids = await getWalletDids(wallet.id, activeSession.token)
        setWalletDids(dids)
        setSelectedDid(dids[0]?.did)
      } catch (error) {
        LoggerInstance.error(error)
      }
    },
    [selectedWallet, sessionToken, setSelectedDid]
  )

  const fetchKeys = useCallback(
    async (wallet = selectedWallet, activeSession = sessionToken) => {
      if (!wallet || !activeSession) return

      try {
        const keys = await getWalletKeys(wallet, activeSession.token)
        setSsiKeys(keys)
        setSelectedKey(selectedKey || keys[0])
      } catch (error) {
        setSessionToken(undefined)
        LoggerInstance.error(error)
      }
    },
    [selectedWallet, sessionToken, selectedKey, setSelectedKey, setSessionToken]
  )

  useEffect(() => {
    if (!sessionToken) return

    if (!selectedWallet) {
      fetchWallets().catch((error) => {
        LoggerInstance.error(error)
      })
    }

    if (!selectedDid) {
      fetchDids().catch((error) => {
        LoggerInstance.error(error)
      })
    }

    if (!selectedKey) {
      fetchKeys().catch((error) => {
        LoggerInstance.error(error)
      })
    }
  }, [
    sessionToken,
    selectedWallet,
    selectedDid,
    selectedKey,
    fetchWallets,
    fetchDids,
    fetchKeys
  ])

  useEffect(() => {
    if (!selectedDid || !walletDids.length || !ssiKeys.length) return

    const matchingDid = walletDids.find((did) => did.did === selectedDid)
    const matchingKey = ssiKeys.find(
      (key) => key.keyId.id === matchingDid?.keyId
    )

    if (matchingKey) {
      setSelectedKey(matchingKey)
    }
  }, [selectedDid, walletDids, ssiKeys, setSelectedKey])

  const reconnectSession = useCallback(async () => {
    if (!isConnected) {
      toast.error(walletRequiredMessage)
      return { success: false as const, session: undefined }
    }

    if (!walletClient) {
      toast.error('Wallet signer not available')
      return { success: false as const, session: undefined }
    }

    if (!ensureAllowedChainForSsi()) {
      return { success: false as const, session: undefined }
    }

    if (sessionToken?.token) {
      try {
        const valid = await isSessionValid(sessionToken.token)
        if (valid) {
          return { success: true as const, session: sessionToken }
        }
      } catch (error) {
        LoggerInstance.error('Session check failed', error)
      }
    }

    try {
      const nextSession = await connectToWallet(walletClient)
      setSessionToken(nextSession)
      if (showConnectedToast) {
        toast.success('SSI Wallet Connected')
      }

      return { success: true as const, session: nextSession }
    } catch (error) {
      setSessionToken(undefined)
      LoggerInstance.error('SSI connect error:', error)
      const message =
        error instanceof Error ? error.message : 'SSI connection failed'
      toast.error(message)
      return { success: false as const, session: undefined }
    }
  }, [
    isConnected,
    walletRequiredMessage,
    walletClient,
    ensureAllowedChainForSsi,
    sessionToken,
    setSessionToken,
    showConnectedToast
  ])

  const runWhileBusy = useCallback(
    async (action: () => Promise<void>) => {
      if (isSsiBusy) return

      setIsLoadingSsiData(true)
      try {
        await action()
      } finally {
        setIsLoadingSsiData(false)
      }
    },
    [isSsiBusy]
  )

  const handleOpenDialog = useCallback(async () => {
    await runWhileBusy(async () => {
      try {
        const reconnectResult = await reconnectSession()
        if (!reconnectResult.success || !reconnectResult.session) return

        const wallet = await fetchWallets(reconnectResult.session)
        await fetchDids(wallet, reconnectResult.session)
        await fetchKeys(wallet, reconnectResult.session)
        setShowDialog(true)
      } catch (error) {
        LoggerInstance.error(error)
        toast.error('Failed to load SSI data')
      }
    })
  }, [runWhileBusy, reconnectSession, fetchWallets, fetchDids, fetchKeys])

  const handleConnectClick = useCallback(async () => {
    await runWhileBusy(async () => {
      await reconnectSession()
    })
  }, [runWhileBusy, reconnectSession])

  const handleWalletSelection = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const walletId = event.target.value
      const wallet = ssiWallets.find((item) => item.id === walletId)
      setSelectedWallet(wallet)

      if (!wallet || !sessionToken) return

      setSelectedKey(undefined)
      setSelectedDid(undefined)
      fetchDids(wallet, sessionToken).catch((error) => {
        LoggerInstance.error(error)
      })
      fetchKeys(wallet, sessionToken).catch((error) => {
        LoggerInstance.error(error)
      })
    },
    [
      ssiWallets,
      setSelectedWallet,
      sessionToken,
      setSelectedKey,
      setSelectedDid,
      fetchDids,
      fetchKeys
    ]
  )

  const handleKeySelection = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const keyId = event.target.value
      const key = ssiKeys.find((item) => item.keyId.id === keyId)
      setSelectedKey(key)
    },
    [ssiKeys, setSelectedKey]
  )

  const handleResetWalletCache = useCallback(() => {
    ssiWalletCache.clearCredentials()
    setCachedCredentials([])
    clearVerifierSessionCache()
    toast.info('SSI wallet cache cleared')
  }, [ssiWalletCache, setCachedCredentials, clearVerifierSessionCache])

  if (!appConfig.ssiEnabled) {
    return <></>
  }

  return (
    <>
      <Modal
        title="SSI Wallets & Keys"
        isOpen={showDialog}
        onToggleModal={() => setShowDialog(false)}
        shouldCloseOnOverlayClick={false}
        className={styles.dialogBorder}
      >
        <div className={styles.panelColumn}>
          <div className={styles.marginBottom1}>
            <label>SSI Wallet URL:</label>
            <div className={styles.inputField}>{getSsiWalletApi()}</div>
          </div>

          <label htmlFor="ssiWallets" className={styles.marginBottom7px}>
            Choose your wallet:
          </label>
          <select
            value={selectedWallet?.id}
            id="ssiWallets"
            className={`${styles.marginBottom2} ${styles.padding1} ${styles.inputField}`}
            onChange={handleWalletSelection}
          >
            {ssiWallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.name}
              </option>
            ))}
          </select>

          <label htmlFor="ssiDids" className={styles.marginBottom7px}>
            Choose the Publisher&apos;s DID:
          </label>
          <select
            value={selectedDid}
            id="ssiDids"
            className={`${styles.marginBottom2} ${styles.padding1} ${styles.inputField}`}
            onChange={(event) => setSelectedDid(event.target.value)}
          >
            {walletDids.map((did) => (
              <option key={did.did} value={did.did}>
                {did.alias || did.did}
              </option>
            ))}
          </select>

          <label htmlFor="ssiKeys" className={styles.marginBottom7px}>
            Choose your signing key:
          </label>
          <select
            value={selectedKey?.keyId.id}
            id="ssiKeys"
            className={`${styles.marginBottom2} ${styles.padding1} ${styles.inputField}`}
            onChange={handleKeySelection}
          >
            {ssiKeys.map((key) => (
              <option
                key={key.keyId.id}
                value={key.keyId.id}
                className={styles.panelRow}
              >
                {getKeyLabel(key)}
              </option>
            ))}
          </select>

          {safeCachedCredentials.length > 0 ? (
            <div className={styles.marginBottom2}>
              <label>Cached Credentials:</label>
              <ul className={styles.list}>
                {safeCachedCredentials.map((credential) => (
                  <li key={credential.id} className={styles.listItem}>
                    {getSsiVerifiableCredentialType(credential)}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className={styles.marginBottom1} />
          )}

          <div className={styles.buttonStyles}>
            <Button
              style="primary"
              size="small"
              className={`${styles.width100p} ${styles.closeButton}`}
              onClick={() => setShowDialog(false)}
            >
              Close
            </Button>
            <Button
              style="primary"
              size="small"
              className={`${styles.width100p} ${styles.resetButton} ${styles.marginBottom1}`}
              onClick={handleResetWalletCache}
            >
              Reset Wallet Cache
            </Button>
          </div>
        </div>
      </Modal>

      <button
        type="button"
        className={`${styles.ssiPanel} ${
          isConnectedWithSession ? styles.connected : styles.disconnected
        }`}
        onClick={isConnectedWithSession ? handleOpenDialog : handleConnectClick}
        disabled={isSsiBusy}
        aria-label={
          isConnectedWithSession
            ? 'Open SSI wallet selector'
            : 'Connect to SSI wallet'
        }
      >
        <span className={styles.text}>SSI</span>

        <span className={styles.iconWrapper}>
          {isSsiBusy ? (
            <Loader variant="white" noMargin />
          ) : isConnectedWithSession ? (
            <ConnectedIcon className={styles.icon} aria-hidden="true" />
          ) : (
            <DisconnectedIcon className={styles.icon} aria-hidden="true" />
          )}
        </span>
      </button>
    </>
  )
}
