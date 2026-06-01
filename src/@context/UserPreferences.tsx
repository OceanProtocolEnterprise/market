import {
  createContext,
  useContext,
  ReactElement,
  ReactNode,
  useState,
  useEffect
} from 'react'
import { LoggerInstance, LogLevel } from '@oceanprotocol/lib'
import { isBrowser } from '@utils/index'
import { useMarketMetadata } from './MarketMetadata'
import { AssetViewOptions, isAssetViewOption } from 'src/@types/AssetView'

interface UserPreferencesValue {
  debug: boolean
  setDebug: (value: boolean) => void
  currency: string
  setCurrency: (value: string) => void
  chainIds: number[]
  privacyPolicySlug: string
  showPPC: boolean
  setChainIds: (chainIds: number[]) => void
  bookmarks: string[]
  addBookmark: (did: string) => void
  removeBookmark: (did: string) => void
  removeBookmarks: (dids: string[]) => void
  setPrivacyPolicySlug: (slug: string) => void
  setShowPPC: (value: boolean) => void
  allowExternalContent: boolean
  setAllowExternalContent: (value: boolean) => void
  locale: string
  showOnboardingModule: boolean
  setShowOnboardingModule: (value: boolean) => void
  showSsiWalletModule: boolean
  setShowSsiWalletModule: (value: boolean) => void
  onboardingStep: number
  setOnboardingStep: (step: number) => void
  assetView: AssetViewOptions
  setAssetView: (view: AssetViewOptions) => void
}

type StoredUserPreferences = Partial<
  Pick<
    UserPreferencesValue,
    | 'debug'
    | 'currency'
    | 'chainIds'
    | 'privacyPolicySlug'
    | 'showPPC'
    | 'bookmarks'
    | 'allowExternalContent'
    | 'showOnboardingModule'
    | 'onboardingStep'
    | 'assetView'
  >
> | null

const UserPreferencesContext = createContext(null)

const localStorageKey = 'ocean-user-preferences-v4'

function getLocalStorage(): StoredUserPreferences {
  if (!isBrowser) return null

  try {
    const storedPreferences = window.localStorage.getItem(localStorageKey)
    if (!storedPreferences) return null

    return JSON.parse(storedPreferences)
  } catch {
    return null
  }
}

function setLocalStorage(values: Partial<UserPreferencesValue>) {
  if (!isBrowser) return

  try {
    window.localStorage.setItem(localStorageKey, JSON.stringify(values))
  } catch {
    // Storage can be unavailable in restricted browsing contexts.
  }
}

function UserPreferencesProvider({
  children
}: {
  children: ReactNode
}): ReactElement {
  const { appConfig, validatedSupportedChains, isValidatingSupportedChains } =
    useMarketMetadata()
  const localStorage = getLocalStorage()
  const storedAssetView = localStorage?.assetView
  // Set default values from localStorage
  const [debug, setDebug] = useState<boolean>(localStorage?.debug || false)
  const [currency, setCurrency] = useState<string>(
    localStorage?.currency || 'EUR'
  )
  const [locale, setLocale] = useState<string>()
  const [bookmarks, setBookmarks] = useState(localStorage?.bookmarks || [])
  const [chainIds, setChainIds] = useState<number[]>(
    localStorage?.chainIds || []
  )
  const { defaultPrivacyPolicySlug, showOnboardingModuleByDefault } = appConfig
  const [showOnboardingModule, setShowOnboardingModule] = useState<boolean>(
    localStorage?.showOnboardingModule ?? showOnboardingModuleByDefault
  )
  const [showSsiWalletModule, setShowSsiWalletModule] = useState<boolean>(false)
  const [onboardingStep, setOnboardingStep] = useState<number>(
    localStorage?.onboardingStep || 0
  )

  const [privacyPolicySlug, setPrivacyPolicySlug] = useState<string>(
    localStorage?.privacyPolicySlug || defaultPrivacyPolicySlug
  )

  const [showPPC, setShowPPC] = useState<boolean>(
    localStorage?.showPPC !== false
  )

  const [allowExternalContent, setAllowExternalContent] = useState<boolean>(
    localStorage?.allowExternalContent || false
  )

  const [assetView, setAssetView] = useState<AssetViewOptions>(
    isAssetViewOption(storedAssetView) ? storedAssetView : AssetViewOptions.Grid
  )

  // Write values to localStorage on change
  useEffect(() => {
    setLocalStorage({
      chainIds,
      debug,
      currency,
      bookmarks,
      privacyPolicySlug,
      showPPC,
      showOnboardingModule,
      onboardingStep,
      allowExternalContent,
      assetView
    })
  }, [
    chainIds,
    debug,
    currency,
    bookmarks,
    privacyPolicySlug,
    showPPC,
    allowExternalContent,
    showOnboardingModule,
    onboardingStep,
    assetView
  ])

  // Set ocean.js log levels, default: Error
  useEffect(() => {
    debug === true
      ? LoggerInstance.setLevel(LogLevel.Verbose)
      : LoggerInstance.setLevel(LogLevel.Error)
  }, [debug])

  // Get locale always from user's browser
  useEffect(() => {
    if (!window) return
    setLocale(window.navigator.language)
  }, [])

  function addBookmark(didToAdd: string): void {
    setBookmarks((currentBookmarks: string[]) =>
      currentBookmarks.includes(didToAdd)
        ? currentBookmarks
        : [...currentBookmarks, didToAdd]
    )
  }

  function removeBookmark(didToAdd: string): void {
    setBookmarks((currentBookmarks: string[]) =>
      currentBookmarks.filter((did: string) => did !== didToAdd)
    )
  }

  function removeBookmarks(didsToRemove: string[]): void {
    const didsToRemoveSet = new Set(didsToRemove)

    setBookmarks((currentBookmarks: string[]) =>
      currentBookmarks.filter((did: string) => !didsToRemoveSet.has(did))
    )
  }

  // Bookmarks old data structure migration
  useEffect(() => {
    if (bookmarks.length !== undefined) return
    const newPinned: string[] = []
    for (const network in bookmarks) {
      ;(bookmarks[network] as unknown as string[]).forEach((did: string) => {
        did !== null && newPinned.push(did)
      })
    }
    setBookmarks(newPinned)
  }, [bookmarks])

  // chainIds old data migration
  // remove deprecated networks from user-saved chainIds
  useEffect(() => {
    if (!chainIds.includes(3) && !chainIds.includes(4)) return
    const newChainIds = chainIds.filter((id) => id !== 3 && id !== 4)
    setChainIds(newChainIds)
  }, [chainIds])

  useEffect(() => {
    if (isValidatingSupportedChains) return

    setChainIds((currentChainIds) => {
      const validCurrentChainIds = currentChainIds.filter((chainId) =>
        validatedSupportedChains.includes(chainId)
      )

      if (validCurrentChainIds.length > 0) {
        return validCurrentChainIds
      }

      if (
        currentChainIds.length === validatedSupportedChains.length &&
        currentChainIds.every(
          (chainId, index) => chainId === validatedSupportedChains[index]
        )
      ) {
        return currentChainIds
      }

      return validatedSupportedChains
    })
  }, [isValidatingSupportedChains, validatedSupportedChains])

  return (
    <UserPreferencesContext.Provider
      value={
        {
          debug,
          currency,
          locale,
          chainIds,
          bookmarks,
          privacyPolicySlug,
          showPPC,
          setChainIds,
          setDebug,
          setCurrency,
          addBookmark,
          removeBookmark,
          removeBookmarks,
          setPrivacyPolicySlug,
          setShowPPC,
          allowExternalContent,
          setAllowExternalContent,
          showOnboardingModule,
          setShowOnboardingModule,
          showSsiWalletModule,
          setShowSsiWalletModule,
          onboardingStep,
          setOnboardingStep,
          assetView,
          setAssetView
        } as UserPreferencesValue
      }
    >
      {children}
    </UserPreferencesContext.Provider>
  )
}

// Helper hook to access the provider values
const useUserPreferences = (): UserPreferencesValue =>
  useContext(UserPreferencesContext)

export { UserPreferencesProvider, useUserPreferences }
