import {
  ReactElement,
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

  function readDraftFromConsent(): Record<string, boolean> {
    const draft: Record<string, boolean> = {}
    optionalCookies?.forEach((cookie) => {
      draft[cookie.cookieName] =
        cookieConsentStatus[cookie.cookieName] === CookieConsentStatus.APPROVED
    })
    return draft
  }

  function switchView(nextView: View) {
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
  }

  // Animate the card height between the two views: the bottom edge stays
  // pinned while the card grows or shrinks in place as one element.
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

  // Reopening from the footer's Cookie Settings link goes straight to the
  // expanded preferences view; the compact card is for the first decision.
  useEffect(() => {
    if (showPPC && !wasShownRef.current && hasOptionalCookies) {
      setDraftConsent(readDraftFromConsent())
      setView('manage')
      setContentVisible(true)
    }
    wasShownRef.current = showPPC
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPPC, hasOptionalCookies])

  useEffect(() => {
    if (!showPPC || view !== 'manage') return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') switchView('compact')
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPPC, view])

  function closeBanner() {
    setShowPPC(false)
    window.setTimeout(() => {
      setView('compact')
      setContentVisible(true)
    }, MORPH_DURATION_MS)
  }

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

  return (
    <div
      ref={cardRef}
      className={cx(styles.wrapper, { hidden: !showPPC })}
      role="region"
      aria-label={content.title}
    >
      <div className={cx(styles.content, { contentHidden: !contentVisible })}>
        {view === 'compact' ? (
          <>
            <p className={styles.title}>{content.title}</p>
            <Markdown text={bannerText} className={styles.text} />
            {hasOptionalCookies ? (
              <div className={styles.buttons}>
                <Button
                  size="small"
                  style="accent"
                  onClick={() => handleAllCookies(true)}
                >
                  {content.accept || 'Accept all'}
                </Button>
                <Button
                  size="small"
                  style="outlined"
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
                <Button size="small" style="accent" onClick={closeBanner}>
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
                  onClick={() =>
                    setDraftConsent((currentDraft) => ({
                      ...currentDraft,
                      [cookie.cookieName]: !currentDraft[cookie.cookieName]
                    }))
                  }
                >
                  <span className={styles.switchKnob} />
                </button>
              </div>
            ))}
            <div className={styles.footer}>
              <Button
                size="small"
                style="accent"
                onClick={handleSavePreferences}
              >
                {content.save || 'Save preferences'}
              </Button>
              <Button
                size="small"
                style="outlined"
                onClick={() => handleAllCookies(true)}
              >
                {content.accept || 'Accept all'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
