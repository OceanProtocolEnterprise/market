const mockInit = jest.fn()
const mockGetRuntimeConfig = jest.fn()
const mockHasOptedOutCapturing = jest.fn()
const mockOptInCapturing = jest.fn()
const mockOptOutCapturing = jest.fn()
const mockReset = jest.fn()
const mockSetConfig = jest.fn()

jest.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    init: (...args: unknown[]) => mockInit(...args),
    has_opted_out_capturing: () => mockHasOptedOutCapturing(),
    opt_in_capturing: (...args: unknown[]) => mockOptInCapturing(...args),
    opt_out_capturing: () => mockOptOutCapturing(),
    reset: (...args: unknown[]) => mockReset(...args),
    set_config: (...args: unknown[]) => mockSetConfig(...args)
  }
}))

jest.mock('./runtimeConfig', () => ({
  getRuntimeConfig: () => mockGetRuntimeConfig()
}))

describe('initAnalytics', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    mockGetRuntimeConfig.mockReset()
    mockHasOptedOutCapturing.mockReturnValue(false)
  })

  it('does nothing when no PostHog key is configured', () => {
    mockGetRuntimeConfig.mockReturnValue({})
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { initAnalytics } = require('./analytics')

    initAnalytics()

    expect(mockInit).not.toHaveBeenCalled()
  })

  it('initialises PostHog only once when a key is present', () => {
    mockGetRuntimeConfig.mockReturnValue({
      NEXT_PUBLIC_POSTHOG_KEY: 'phc_test',
      NEXT_PUBLIC_POSTHOG_HOST: 'https://example.posthog.com'
    })
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { initAnalytics } = require('./analytics')

    initAnalytics()
    initAnalytics()

    expect(mockInit).toHaveBeenCalledTimes(1)
    expect(mockInit).toHaveBeenCalledWith('phc_test', {
      api_host: 'https://example.posthog.com',
      defaults: '2026-01-30'
    })
    expect(mockSetConfig).toHaveBeenLastCalledWith({
      persistence: 'localStorage+cookie',
      opt_out_capturing_by_default: false
    })
  })

  it('falls back to the EU host when none is configured', () => {
    mockGetRuntimeConfig.mockReturnValue({
      NEXT_PUBLIC_POSTHOG_KEY: 'phc_test'
    })
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { initAnalytics } = require('./analytics')

    initAnalytics()

    expect(mockInit).toHaveBeenCalledWith('phc_test', {
      api_host: 'https://eu.i.posthog.com',
      defaults: '2026-01-30'
    })
  })
})

describe('analytics consent lifecycle', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    window.localStorage.clear()
    window.sessionStorage.clear()
    mockGetRuntimeConfig.mockReturnValue({
      NEXT_PUBLIC_POSTHOG_KEY: 'phc_test'
    })
    mockHasOptedOutCapturing.mockReturnValue(false)
  })

  it('keeps an initialized SDK memory-only and opted out after withdrawal', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { disableAnalytics, initAnalytics } = require('./analytics')

    initAnalytics()
    disableAnalytics()

    expect(mockOptOutCapturing).toHaveBeenCalledTimes(1)
    expect(mockSetConfig).toHaveBeenLastCalledWith({
      persistence: 'memory',
      opt_out_capturing_by_default: true
    })
    expect(mockReset).toHaveBeenCalledWith(true)
    expect(mockOptOutCapturing.mock.invocationCallOrder[0]).toBeLessThan(
      mockReset.mock.invocationCallOrder[0]
    )
    expect(mockSetConfig.mock.invocationCallOrder[1]).toBeLessThan(
      mockReset.mock.invocationCallOrder[0]
    )
  })

  it('resumes the existing SDK without initializing it twice', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { disableAnalytics, initAnalytics } = require('./analytics')

    initAnalytics()
    disableAnalytics()
    mockHasOptedOutCapturing.mockReturnValue(true)
    initAnalytics()

    expect(mockInit).toHaveBeenCalledTimes(1)
    expect(mockSetConfig).toHaveBeenLastCalledWith({
      persistence: 'localStorage+cookie',
      opt_out_capturing_by_default: false
    })
    expect(mockOptInCapturing).toHaveBeenCalledWith({
      captureEventName: false
    })
  })

  it('removes both current and legacy PostHog storage keys', () => {
    window.localStorage.setItem('ph_project', 'value')
    window.localStorage.setItem('__ph_opt_in_out_project', '0')
    window.localStorage.setItem('application-key', 'value')
    window.sessionStorage.setItem('ph_session', 'value')

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { disableAnalytics } = require('./analytics')
    disableAnalytics()

    expect(window.localStorage.getItem('ph_project')).toBeNull()
    expect(window.localStorage.getItem('__ph_opt_in_out_project')).toBeNull()
    expect(window.sessionStorage.getItem('ph_session')).toBeNull()
    expect(window.localStorage.getItem('application-key')).toBe('value')
  })

  it('cleans stale analytics data when PostHog is no longer configured', () => {
    mockGetRuntimeConfig.mockReturnValue({})
    window.localStorage.setItem('ph_previous_project', 'value')

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { maybeInitAnalytics } = require('./analytics')
    maybeInitAnalytics()

    expect(mockInit).not.toHaveBeenCalled()
    expect(window.localStorage.getItem('ph_previous_project')).toBeNull()
  })
})

describe('isAnalyticsConfigured', () => {
  beforeEach(() => {
    jest.resetModules()
    mockGetRuntimeConfig.mockReset()
  })

  it('is false when no PostHog key is set (self-hosted default)', () => {
    mockGetRuntimeConfig.mockReturnValue({})
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { isAnalyticsConfigured } = require('./analytics')

    expect(isAnalyticsConfigured()).toBe(false)
  })

  it('is true when a PostHog key is set', () => {
    mockGetRuntimeConfig.mockReturnValue({
      NEXT_PUBLIC_POSTHOG_KEY: 'phc_test'
    })
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { isAnalyticsConfigured } = require('./analytics')

    expect(isAnalyticsConfigured()).toBe(true)
  })
})
