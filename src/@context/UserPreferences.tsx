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
import {
  deleteCookie,
  getCookieValue,
  getJsonCookie,
  setCookie,
  setJsonCookie
} from '@utils/cookies'
import { useMarketMetadata } from './MarketMetadata'
import { AssetViewOptions, isAssetViewOption } from 'src/@types/AssetView'

interface UserPreferencesValue {
  debug: boolean
  setDebug: (value: boolean) => void
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

const UserPreferencesContext = createContext(null)

const consentAcknowledgedCookie = 'cookieConsentAcknowledged'

const preferenceCookies = {
  debug: { name: 'debug', expiresDays: 60 },
  chainIds: { name: 'chainIds', expiresDays: 365 },
  bookmarks: { name: 'bookmarks', expiresDays: 365 },
  allowExternalContent: { name: 'allowExternalContent', expiresDays: 60 },
  onboardingModule: { name: 'onboardingModule', expiresDays: 60 },
  onboardingStep: { name: 'onboardingStep', expiresDays: 60 },
  assetView: { name: 'assetView', expiresDays: 60 }
} as const

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(isNumber)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function readPreference<T>(
  cookie: { name: string },
  isValid: (value: unknown) => value is T
): T | undefined {
  if (!isBrowser) return undefined

  const cookieValue = getJsonCookie<unknown>(cookie.name)
  return isValid(cookieValue) ? cookieValue : undefined
}

function persistPreference(
  cookie: { name: string; expiresDays: number },
  value: unknown,
  isDefault: boolean
): void {
  if (!isBrowser) return

  if (isDefault) {
    if (getCookieValue(cookie.name) !== undefined) deleteCookie(cookie.name)
    return
  }

  setJsonCookie(cookie.name, value, cookie.expiresDays)
}

function haveSameMembers(a: number[], b: number[]): boolean {
  const aSet = new Set(a)
  const bSet = new Set(b)
  if (aSet.size !== bSet.size) return false
  return Array.from(aSet).every((item) => bSet.has(item))
}

function UserPreferencesProvider({
  children
}: {
  children: ReactNode
}): ReactElement {
  const { appConfig, validatedSupportedChains, isValidatingSupportedChains } =
    useMarketMetadata()
  const { defaultPrivacyPolicySlug, showOnboardingModuleByDefault } = appConfig

  const [debug, setDebug] = useState<boolean>(
    readPreference(preferenceCookies.debug, isBoolean) ?? false
  )
  const [locale, setLocale] = useState<string>()
  const [bookmarks, setBookmarks] = useState<string[]>(
    readPreference(preferenceCookies.bookmarks, isStringArray) ?? []
  )
  const [chainIds, setChainIds] = useState<number[]>(
    readPreference(preferenceCookies.chainIds, isNumberArray) ?? []
  )
  const [showOnboardingModule, setShowOnboardingModule] = useState<boolean>(
    readPreference(preferenceCookies.onboardingModule, isBoolean) ??
      showOnboardingModuleByDefault
  )
  const [showSsiWalletModule, setShowSsiWalletModule] = useState<boolean>(false)
  const [onboardingStep, setOnboardingStep] = useState<number>(
    readPreference(preferenceCookies.onboardingStep, isNumber) ?? 0
  )

  const [privacyPolicySlug, setPrivacyPolicySlug] = useState<string>(
    defaultPrivacyPolicySlug
  )

  const [showPPC, setShowPPCState] = useState<boolean>(() =>
    isBrowser ? getCookieValue(consentAcknowledgedCookie) !== 'true' : false
  )

  const [allowExternalContent, setAllowExternalContent] = useState<boolean>(
    readPreference(preferenceCookies.allowExternalContent, isBoolean) ?? false
  )

  const [assetView, setAssetView] = useState<AssetViewOptions>(
    readPreference(preferenceCookies.assetView, isAssetViewOption) ??
      AssetViewOptions.Grid
  )

  function setShowPPC(value: boolean): void {
    setShowPPCState(value)
    if (!value) setCookie(consentAcknowledgedCookie, true)
  }

  useEffect(() => {
    if (!isBrowser) return
    try {
      window.localStorage.removeItem('ocean-user-preferences-v4')
    } catch {}
  }, [])

  useEffect(() => {
    persistPreference(preferenceCookies.debug, debug, debug === false)
  }, [debug])

  useEffect(() => {
    persistPreference(
      preferenceCookies.bookmarks,
      bookmarks,
      !bookmarks?.length
    )
  }, [bookmarks])

  useEffect(() => {
    if (isValidatingSupportedChains || !validatedSupportedChains?.length) return

    persistPreference(
      preferenceCookies.chainIds,
      chainIds,
      haveSameMembers(chainIds, validatedSupportedChains)
    )
  }, [chainIds, isValidatingSupportedChains, validatedSupportedChains])

  useEffect(() => {
    persistPreference(
      preferenceCookies.allowExternalContent,
      allowExternalContent,
      allowExternalContent === false
    )
  }, [allowExternalContent])

  useEffect(() => {
    persistPreference(
      preferenceCookies.onboardingModule,
      showOnboardingModule,
      showOnboardingModule === showOnboardingModuleByDefault
    )
  }, [showOnboardingModule, showOnboardingModuleByDefault])

  useEffect(() => {
    persistPreference(
      preferenceCookies.onboardingStep,
      onboardingStep,
      onboardingStep === 0
    )
  }, [onboardingStep])

  useEffect(() => {
    persistPreference(
      preferenceCookies.assetView,
      assetView,
      assetView === AssetViewOptions.Grid
    )
  }, [assetView])

  useEffect(() => {
    debug === true
      ? LoggerInstance.setLevel(LogLevel.Verbose)
      : LoggerInstance.setLevel(LogLevel.Error)
  }, [debug])

  useEffect(() => {
    if (!isBrowser) return
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
          locale,
          chainIds,
          bookmarks,
          privacyPolicySlug,
          showPPC,
          setChainIds,
          setDebug,
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
