const mockInit = jest.fn()
const mockGetRuntimeConfig = jest.fn()

jest.mock('posthog-js', () => ({
  __esModule: true,
  default: { init: (...args: unknown[]) => mockInit(...args) }
}))

jest.mock('./runtimeConfig', () => ({
  getRuntimeConfig: () => mockGetRuntimeConfig()
}))

describe('initAnalytics', () => {
  beforeEach(() => {
    jest.resetModules()
    mockInit.mockClear()
    mockGetRuntimeConfig.mockReset()
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
