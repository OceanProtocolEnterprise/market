export interface OpcTokenData {
  tokenAddress: string
  feePercentage: string
  maxFee: string
  minFee: string
  approved: boolean
}

export interface OpcFee {
  chainId: number
  // Instead of a single fee, we have an array of fee data per token
  tokensData: OpcTokenData[]
}

export interface AppConfig {
  metadataCacheUri: string
  chainIds: number[]
  chainIdsSupported: number[]
  defaultDatatokenTemplateIndex: number
  marketFeeAddress: string
  publisherMarketOrderFee: string
  publisherMarketFixedSwapFee: string
  consumeMarketOrderFee: string
  consumeMarketFixedSwapFee: string
  customProviderUrl?: string
  allowFixedPricing: string
  allowDynamicPricing: string
  allowFreePricing: string
  defaultPrivacyPolicySlug: string
  privacyPreferenceCenter: string
  darkModeConfig: {
    classNameDark: string
    classNameLight: string
    storageKey: string
  }
  defaultAccessTerms: string
  purgatoryUrl: string
  dockerHubProxyUrl: string
  showPreviewAlert: string
  ssiEnabled: boolean
  showOnboardingModuleByDefault: boolean
  dataspace: string | null
}
export interface SiteContent {
  siteTitle: string
  siteTagline: string
  siteDescription: string
  taglineContinuation: string
  siteUrl: string
  siteImage: string
  copyright: string
  menu: {
    name: string
    link?: string
    subItems?: {
      name: string
      link?: string
      description?: string
      image?: string
      category?: string
      subItems?: {
        name: string
        link: string
        description?: string
        image?: string
        category?: string
      }[]
    }[]
  }[]
  announcement: string
  devPreviewAnnouncement: string
  warning: {
    ctd: string
  }
  footer: {
    subtitle: string
    copyright: string
    privacyTitle: string
    content: {
      title: string
      links: {
        name: string
        link: string
      }[]
    }[]
  }
}

export interface MarketMetadataProviderValue {
  opcFees: OpcFee[]
  siteContent: SiteContent
  appConfig: AppConfig
  getOpcFeeForToken: (tokenAddress: string, chainId: number) => string
  approvedBaseTokens: TokenInfo[]
}
