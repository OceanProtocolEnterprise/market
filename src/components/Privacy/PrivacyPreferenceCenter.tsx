import {
  ReactElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'
import { useConsent, CookieConsentStatus } from '@context/CookieConsent'
import styles from './PrivacyPreferenceCenter.module.css'
import { useGdprMetadata } from '@hooks/useGdprMetadata'
import Markdown from '@shared/Markdown'
import Button from '@shared/atoms/Button'
import { useUserPreferences } from '@context/UserPreferences'
import { isAnalyticsConfigured } from '@utils/analytics'
import ChevronDown from '@images/chevron_down.svg'
import classNames from 'classnames/bind'

const cx = classNames.bind(styles)

const MORPH_DURATION_MS = 300
const MORPH_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'
const CONTENT_FADE_MS = 120
const ENTRANCE_DELAY_MS = 700

type View = 'compact' | 'manage'

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export default function CookieBanner(): ReactElement {
  const {
    cookies: optionalCookies,
    cookieConsentStatus,
    setConsentStatus,
    resetConsentStatus
  } = useConsent()
  const content = useGdprMetadata()
  const { showPPC, setShowPPC } = useUserPreferences()

  const hasOptionalCookies = optionalCookies?.length > 0
  const [view, setView] = useState<View>('compact')
  const [hasEntered, setHasEntered] = useState(!showPPC)
  const [contentVisible, setContentVisible] = useState(true)
  const [draftConsent, setDraftConsent] = useState<Record<string, boolean>>({})
  const cardRef = useRef<HTMLDivElement>(null)
  const morphingRef = useRef(false)
  const startHeightRef = useRef<number | null>(null)
  const wasShownRef = useRef(showPPC)

  const bannerText =
    isAnalyticsConfigured() && content.analyticsText
      ? content.analyticsText
      : content.text

  const readDraftFromConsent = useCallback((): Record<string, boolean> => {
    const draft: Record<string, boolean> = {}
    optionalCookies?.forEach((cookie) => {
      draft[cookie.cookieName] =
        cookieConsentStatus[cookie.cookieName] === CookieConsentStatus.APPROVED
    })
    return draft
  }, [cookieConsentStatus, optionalCookies])

  const switchView = useCallback(
    (nextView: View) => {
      if (morphingRef.current || view === nextView) return
      if (nextView === 'manage') setDraftConsent(readDraftFromConsent())

      if (!cardRef.current || prefersReducedMotion()) {
        setView(nextView)
        return
      }

      morphingRef.current = true
      startHeightRef.current = cardRef.current.offsetHeight
      setContentVisible(false)
      window.setTimeout(() => setView(nextView), CONTENT_FADE_MS)
    },
    [readDraftFromConsent, view]
  )

  const closeBanner = useCallback(() => {
    setShowPPC(false)
    window.setTimeout(() => {
      setView('compact')
      setContentVisible(true)
    }, MORPH_DURATION_MS)
  }, [setShowPPC])

  function handleAllCookies(accepted: boolean) {
    resetConsentStatus(
      accepted ? CookieConsentStatus.APPROVED : CookieConsentStatus.REJECTED
    )
    closeBanner()
  }

  function handleSavePreferences() {
    optionalCookies?.forEach((cookie) => {
      setConsentStatus(
        cookie.cookieName,
        draftConsent[cookie.cookieName]
          ? CookieConsentStatus.APPROVED
          : CookieConsentStatus.REJECTED
      )
    })
    closeBanner()
  }

  function toggleDraftConsent(cookieName: string) {
    setDraftConsent((currentDraft) => ({
      ...currentDraft,
      [cookieName]: !currentDraft[cookieName]
    }))
  }

  useLayoutEffect(() => {
    const startHeight = startHeightRef.current
    const card = cardRef.current
    if (startHeight === null || !card) return
    startHeightRef.current = null

    const endHeight = card.offsetHeight
    card.style.transition = 'none'
    card.style.height = `${startHeight}px`
    card.getBoundingClientRect()
    card.style.transition = `height ${MORPH_DURATION_MS}ms ${MORPH_EASING}`
    card.style.height = `${endHeight}px`

    const fadeTimer = window.setTimeout(() => setContentVisible(true), 90)
    const endTimer = window.setTimeout(() => {
      card.style.height = ''
      card.style.transition = ''
      morphingRef.current = false
    }, MORPH_DURATION_MS + 40)

    return () => {
      window.clearTimeout(fadeTimer)
      window.clearTimeout(endTimer)
      card.style.height = ''
      card.style.transition = ''
      morphingRef.current = false
    }
  }, [view])

  useEffect(() => {
    if (prefersReducedMotion()) {
      setHasEntered(true)
      return
    }

    const timer = window.setTimeout(
      () => setHasEntered(true),
      ENTRANCE_DELAY_MS
    )
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (showPPC && !wasShownRef.current && hasOptionalCookies) {
      setDraftConsent(readDraftFromConsent())
      setView('manage')
      setContentVisible(true)
    }
    wasShownRef.current = showPPC
  }, [hasOptionalCookies, readDraftFromConsent, showPPC])

  useEffect(() => {
    if (!showPPC || view !== 'manage') return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') switchView('compact')
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showPPC, switchView, view])

  return (
    <div
      ref={cardRef}
      className={cx(styles.wrapper, { hidden: !showPPC || !hasEntered })}
      role="region"
      aria-label={content.title}
    >
      <div className={cx(styles.content, { contentHidden: !contentVisible })}>
        {view === 'compact' ? (
          <>
            <p className={styles.title}>{content.title}</p>
            <Markdown
              text={bannerText}
              className={styles.text}
              openLinksInNewTab
            />
            {hasOptionalCookies ? (
              <div className={styles.buttons}>
                <Button
                  size="small"
                  style="accent"
                  className={styles.actionButton}
                  onClick={() => handleAllCookies(true)}
                >
                  {content.accept || 'Accept all'}
                </Button>
                <Button
                  size="small"
                  style="outlined"
                  className={styles.actionButton}
                  onClick={() => handleAllCookies(false)}
                >
                  {content.reject || 'Essential only'}
                </Button>
                <Button
                  size="small"
                  style="text"
                  className={styles.manageButton}
                  onClick={() => switchView('manage')}
                >
                  {content.configure || 'Manage'}
                </Button>
              </div>
            ) : (
              <div className={styles.buttons}>
                <Button
                  size="small"
                  style="accent"
                  className={styles.actionButton}
                  onClick={closeBanner}
                >
                  {content.close || 'Got it'}
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className={styles.manageHeader}>
              <p className={styles.title}>{content.title}</p>
              <button
                type="button"
                className={styles.collapseButton}
                aria-label="Back to summary"
                onClick={() => switchView('compact')}
              >
                <ChevronDown />
              </button>
            </div>
            <Markdown
              text={
                content.manageIntro || 'Choose which cookies this site may use.'
              }
              className={styles.text}
              openLinksInNewTab
            />
            <div className={styles.row}>
              <div>
                <p className={styles.rowTitle}>
                  {content.essential?.title || 'Strictly necessary'}
                </p>
                <p className={styles.rowDescription}>
                  {content.essential?.desc ||
                    'Sign-in, wallet connections, saved settings'}
                </p>
              </div>
              <span className={styles.alwaysOn}>Always on</span>
            </div>
            {optionalCookies.map((cookie) => (
              <div className={styles.row} key={cookie.cookieName}>
                <div>
                  <p className={styles.rowTitle}>{cookie.title}</p>
                  <p className={styles.rowDescription}>{cookie.desc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draftConsent[cookie.cookieName] === true}
                  aria-label={cookie.title}
                  className={cx(styles.switch, {
                    switchOn: draftConsent[cookie.cookieName] === true
                  })}
                  onClick={() => toggleDraftConsent(cookie.cookieName)}
                >
                  <span className={styles.switchKnob} />
                </button>
              </div>
            ))}
            <div className={styles.footer}>
              <Button
                size="small"
                style="accent"
                className={styles.actionButton}
                onClick={handleSavePreferences}
              >
                {content.save || 'Save preferences'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
