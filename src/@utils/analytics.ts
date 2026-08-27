import posthog from 'posthog-js'
import appConfig from 'app.config.cjs'
import Cookies from 'js-cookie'
import { getRuntimeConfig } from './runtimeConfig'
import { getCookieValue } from './cookies'

const DEFAULT_POSTHOG_HOST = 'https://eu.i.posthog.com'
const DEFAULT_POSTHOG_PERSISTENCE = 'localStorage+cookie'

export const ANALYTICS_CONSENT_COOKIE = 'AnalyticsCookieConsent'

let initialized = false

function isPostHogKey(name: string): boolean {
  return name.startsWith('ph_') || name.startsWith('__ph')
}

function removePostHogStorageKeys(
  storageName: 'localStorage' | 'sessionStorage'
): void {
  try {
    const storage = window[storageName]
    Object.keys(storage)
      .filter(isPostHogKey)
      .forEach((name) => storage.removeItem(name))
  } catch {
    // Web Storage can be unavailable when the browser blocks site data.
  }
}

function removePostHogStorage(): void {
  if (typeof window === 'undefined') return

  try {
    const hostnameLabels = window.location.hostname.split('.')
    const cookieDomains = hostnameLabels
      .slice(0, -1)
      .map((_, index) => hostnameLabels.slice(index).join('.'))

    Object.keys(Cookies.get())
      .filter(isPostHogKey)
      .forEach((name) => {
        Cookies.remove(name, { path: '/' })
        cookieDomains.forEach((domain) =>
          Cookies.remove(name, { path: '/', domain })
        )
      })
  } catch {
    // Cookie access can be unavailable in restricted browser contexts.
  }

  removePostHogStorageKeys('localStorage')
  removePostHogStorageKeys('sessionStorage')
}

export function hasAnalyticsConsent(): boolean {
  if (typeof document === 'undefined') return false
  return getCookieValue(ANALYTICS_CONSENT_COOKIE) === 'true'
}

/**
 * Whether PostHog analytics is configured for this deployment. False on
 * self-hosted instances that have not set NEXT_PUBLIC_POSTHOG_KEY, so the UI
 * can avoid claiming analytics is active when it is not.
 */
export function isAnalyticsConfigured(): boolean {
  return Boolean(getRuntimeConfig().NEXT_PUBLIC_POSTHOG_KEY)
}

/**
 * Initialise PostHog product analytics, mirroring the snippet used on
 * oceanenterprise.io. Runs once, client-side only, and fires on load.
 *
 * No-ops when NEXT_PUBLIC_POSTHOG_KEY is unset — the default for self-hosted
 * deployments, so a self-hoster sends nothing unless they explicitly opt in.
 * The key/host are read from the runtime config so they work on both the
 * Vercel build and the self-hosted Docker image (env injected at boot).
 */
export function initAnalytics(): void {
  if (typeof window === 'undefined') return

  const { NEXT_PUBLIC_POSTHOG_KEY, NEXT_PUBLIC_POSTHOG_HOST } =
    getRuntimeConfig()

  if (!NEXT_PUBLIC_POSTHOG_KEY) return

  if (!initialized) {
    posthog.init(NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: NEXT_PUBLIC_POSTHOG_HOST || DEFAULT_POSTHOG_HOST,
      defaults: '2026-01-30'
    })
    initialized = true
  }

  const wasOptedOut = posthog.has_opted_out_capturing()
  posthog.set_config({
    persistence: DEFAULT_POSTHOG_PERSISTENCE,
    opt_out_capturing_by_default: false
  })

  if (wasOptedOut) posthog.opt_in_capturing({ captureEventName: false })
}

export function disableAnalytics(): void {
  if (initialized) {
    posthog.opt_out_capturing()
    posthog.set_config({
      persistence: 'memory',
      opt_out_capturing_by_default: true
    })
    posthog.reset(true)
  }

  removePostHogStorage()
}

export function maybeInitAnalytics(): void {
  const consentRequired = appConfig?.privacyPreferenceCenter === 'true'
  if (!isAnalyticsConfigured() || (consentRequired && !hasAnalyticsConsent())) {
    disableAnalytics()
    return
  }

  initAnalytics()
}
