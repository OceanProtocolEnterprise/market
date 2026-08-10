import posthog from 'posthog-js'
import { getRuntimeConfig } from './runtimeConfig'

const DEFAULT_POSTHOG_HOST = 'https://eu.i.posthog.com'

let initialized = false

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

  initialized = true
}
