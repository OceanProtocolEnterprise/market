import {
  useContext,
  useState,
  createContext,
  useEffect,
  ReactNode,
  ReactElement
} from 'react'
import { deleteCookie, getCookieValue, setCookie } from '@utils/cookies'
import {
  ANALYTICS_CONSENT_COOKIE,
  disableAnalytics,
  maybeInitAnalytics
} from '@utils/analytics'
import { UseGdprMetadata, useGdprMetadata } from '@hooks/useGdprMetadata'
import { useMarketMetadata } from './MarketMetadata'

export enum CookieConsentStatus {
  NOT_AVAILABLE = -1,
  APPROVED = 0,
  REJECTED = 1
}

interface ConsentStatus {
  [name: string]: CookieConsentStatus
}

interface ConsentProviderValue {
  cookies: UseGdprMetadata['optionalCookies']
  cookieConsentStatus: ConsentStatus
  setConsentStatus: (cookieName: string, status: CookieConsentStatus) => void
  resetConsentStatus: (status?: CookieConsentStatus) => void
}

const ConsentContext = createContext({} as ConsentProviderValue)

function ConsentProvider({ children }: { children: ReactNode }): ReactElement {
  const cookies = useGdprMetadata()

  const { appConfig } = useMarketMetadata()

  const [consentStatus, setConsentStatus] = useState({} as ConsentStatus)

  function resetConsentStatus(status = CookieConsentStatus.NOT_AVAILABLE) {
    const resetCookieConsent = {} as ConsentStatus
    cookies.optionalCookies?.forEach((cookie) => {
      deleteCookie(cookie.cookieName)
      resetCookieConsent[cookie.cookieName] = status
    })
    setConsentStatus(resetCookieConsent)
  }

  function setCookieConsentStatus(
    cookieName: string,
    status: CookieConsentStatus
  ) {
    setConsentStatus((currentStatus) => ({
      ...currentStatus,
      [cookieName]: status
    }))
  }

  function handleAccept(cookieName: string) {
    setCookie(cookieName, true)
    switch (cookieName) {
      case ANALYTICS_CONSENT_COOKIE:
        maybeInitAnalytics()
        break
      default:
        break
    }
  }

  function handleReject(cookieName: string) {
    setCookie(cookieName, false)
    switch (cookieName) {
      case ANALYTICS_CONSENT_COOKIE:
        disableAnalytics()
        break
      default:
        break
    }
  }

  useEffect(() => {
    if (appConfig?.privacyPreferenceCenter !== 'true') return

    const initialValues = {} as ConsentStatus
    cookies.optionalCookies?.forEach((cookie) => {
      const cookieValue = getCookieValue(cookie.cookieName)

      switch (cookieValue) {
        case 'true':
          initialValues[cookie.cookieName] = CookieConsentStatus.APPROVED
          break
        case 'false':
          initialValues[cookie.cookieName] = CookieConsentStatus.REJECTED
          break
        default:
          initialValues[cookie.cookieName] = CookieConsentStatus.NOT_AVAILABLE
          break
      }
    })

    setConsentStatus(initialValues)
  }, [cookies.optionalCookies, appConfig])

  useEffect(() => {
    Object.keys(consentStatus).forEach((cookieName) => {
      switch (consentStatus[cookieName]) {
        case CookieConsentStatus.APPROVED:
          handleAccept(cookieName)
          break
        case CookieConsentStatus.REJECTED:
          handleReject(cookieName)
          break
      }
    })
  }, [consentStatus])

  return (
    <ConsentContext.Provider
      value={
        {
          cookies: cookies.optionalCookies || [],
          cookieConsentStatus: consentStatus,
          setConsentStatus: setCookieConsentStatus,
          resetConsentStatus
        } as ConsentProviderValue
      }
    >
      {children}
    </ConsentContext.Provider>
  )
}

const useConsent = (): ConsentProviderValue => useContext(ConsentContext)

export { useConsent }
export default ConsentProvider
