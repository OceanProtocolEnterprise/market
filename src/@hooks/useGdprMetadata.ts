import gdprContent from '../../content/gdpr.json'
import { useMemo } from 'react'
import {
  ANALYTICS_CONSENT_COOKIE,
  isAnalyticsConfigured
} from '@utils/analytics'

export interface UseGdprMetadata {
  title: string
  text: string
  analyticsText?: string
  accept: string
  reject: string
  close: string
  save?: string
  configure: string
  placeholder?: string
  optionalCookies?: {
    title: string
    desc: string
    cookieName: string
  }[]
}

export function useGdprMetadata(): UseGdprMetadata {
  const analyticsConfigured = isAnalyticsConfigured()
  const optionalCookies = useMemo(
    () =>
      (gdprContent.optionalCookies || []).filter(
        (cookie) =>
          cookie.cookieName !== ANALYTICS_CONSENT_COOKIE || analyticsConfigured
      ),
    [analyticsConfigured]
  )

  return { ...gdprContent, optionalCookies }
}
