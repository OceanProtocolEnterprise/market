import posthog from 'posthog-js'
import appConfig from 'app.config.cjs'
import Cookies from 'js-cookie'
import { getRuntimeConfig } from './runtimeConfig'
import { getCookieValue } from './cookies'

const DEFAULT_POSTHOG_HOST = 'https://eu.i.posthog.com'

export const ANALYTICS_CONSENT_COOKIE = 'AnalyticsCookieConsent'

let initialized = false

function removePostHogStorage(): void {
  if (typeof window === 'undefined') return

  Object.keys(Cookies.get())
    .filter((name) => name.startsWith('ph_'))
    .forEach((name) => Cookies.remove(name, { path: '/' }))

  const storageAreas = [window.localStorage, window.sessionStorage]
  storageAreas.forEach((storage) => {
    Object.keys(storage)
      .filter((name) => name.startsWith('ph_'))
      .forEach((name) => storage.removeItem(name))
  })
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
  if (typeof window === 'undefined' || initialized) return

  const { NEXT_PUBLIC_POSTHOG_KEY, NEXT_PUBLIC_POSTHOG_HOST } =
    getRuntimeConfig()

  if (!NEXT_PUBLIC_POSTHOG_KEY) return

  posthog.init(NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: NEXT_PUBLIC_POSTHOG_HOST || DEFAULT_POSTHOG_HOST,
    // Matches the marketing site. Enables SPA-aware pageviews
    // (capture_pageview: 'history_change') and injects external scripts into
    // <head> to avoid Next.js SSR hydration errors.
    defaults: '2026-01-30'
  })

  if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing()

  initialized = true
}

export function maybeInitAnalytics(): void {
  if (!isAnalyticsConfigured()) return

  const consentRequired = appConfig?.privacyPreferenceCenter === 'true'
  if (consentRequired && !hasAnalyticsConsent()) return

  initAnalytics()
}

export function disableAnalytics(): void {
  removePostHogStorage()
  if (!initialized) return

  posthog.opt_out_capturing()
  posthog.reset(true)
  initialized = false
}
