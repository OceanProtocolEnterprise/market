module.exports = {
  // URI of single metadata cache instance for all networks.
  // While ocean.js includes this value for each network as part of its ConfigHelper,
  // it is assumed to be the same for all networks.
  // In components can be accessed with the useMarketMetadata hook:
  // const { appConfig } = useMarketMetadata()
  // return appConfig.metadataCacheUri
  metadataCacheUri:
    process.env.NEXT_PUBLIC_METADATACACHE_URI ||
    'https://v4.aquarius.oceanprotocol.com',

  // List of chainIds which metadata cache queries will return by default.
  // This preselects the Chains user preferences.
  chainIds: [11155111, 8996],

  // List of all supported chainIds. Used to populate the Chains user preferences list.
  chainIdsSupported: [11155111, 8996],

  customProviderUrl: process.env.NEXT_PUBLIC_PROVIDER_URL,

  infuraProjectId: process.env.NEXT_PUBLIC_INFURA_PROJECT_ID || 'xxx',

  defaultDatatokenCap:
    '115792089237316195423570985008687907853269984665640564039457',
  defaultDatatokenTemplateIndex: 2,
  // The ETH address the marketplace fee will be sent to.
  marketFeeAddress:
    process.env.NEXT_PUBLIC_MARKET_FEE_ADDRESS ||
    '0x9984b2453eC7D99a73A5B3a46Da81f197B753C8d',
  // publisher market fee that is taken upon ordering an asset, it is an absolute value, it is declared on erc20 creation
  publisherMarketOrderFee:
    process.env.NEXT_PUBLIC_PUBLISHER_MARKET_ORDER_FEE || '0',
  // fee recieved by the publisher market when a dt is bought from a fixed rate exchange, percent
  publisherMarketFixedSwapFee:
    process.env.NEXT_PUBLIC_PUBLISHER_MARKET_FIXED_SWAP_FEE || '0',

  // consume market fee that is taken upon ordering an asset, it is an absolute value, it is specified on order
  consumeMarketOrderFee:
    process.env.NEXT_PUBLIC_CONSUME_MARKET_ORDER_FEE || '0',
  // fee recieved by the consume market when a dt is bought from a fixed rate exchange, percent
  consumeMarketFixedSwapFee:
    process.env.NEXT_PUBLIC_CONSUME_MARKET_FIXED_SWAP_FEE || '0',

  marketCommunityFee: process.env.NEXT_PUBLIC_MARKET_COMMUNITY_FEE || '0.3',

  // Config for https://github.com/oceanprotocol/use-dark-mode
  darkModeConfig: {
    classNameDark: 'dark',
    classNameLight: 'light',
    storageKey: 'oceanDarkMode'
  },

  // Used to show or hide the fixed, dynamic or free price options
  // tab to publishers during the price creation.
  allowFixedPricing: process.env.NEXT_PUBLIC_ALLOW_FIXED_PRICING || 'true',
  allowDynamicPricing: process.env.NEXT_PUBLIC_ALLOW_DYNAMIC_PRICING || 'false',
  allowFreePricing: process.env.NEXT_PUBLIC_ALLOW_FREE_PRICING || 'true',

  // Set the default privacy policy to initially display
  // this should be the slug of your default policy markdown file
  defaultPrivacyPolicySlug: '/privacy/en',

  // This enables / disables the use of a GDPR compliant
  // privacy preference center to manage cookies on the market
  // If set to true a gdpr.json file inside the content directory
  // is used to create and show a privacy preference center / cookie banner
  // To learn more about how to configure and use this, please refer to the readme
  privacyPreferenceCenter:
    process.env.NEXT_PUBLIC_PRIVACY_PREFERENCE_CENTER || 'true',

  // Default terms to be used for service offerings made on this marketplace
  defaultAccessTerms:
    'https://raw.githubusercontent.com/OceanProtocolEnterprise/market/main/content/pages/terms.md',

  // Purgatory URI, leave as an empty string to disable the API call
  purgatoryUrl: process.env.NEXT_PUBLIC_PURGATORY_URI || '',

  // The url used to fetch docker hub image info
  dockerHubProxyUrl:
    process.env.NEXT_PUBLIC_DOCKER_HUB_PROXY_URL ||
    'https://dockerhub-proxy.oceanprotocol.com',

  // Display alert banner for the developer preview deployment
  showPreviewAlert: process.env.NEXT_PUBLIC_SHOW_PREVIEW_ALERT || 'false',
  oceanTokenAddress: process.env.NEXT_PUBLIC_OCEAN_TOKEN_ADDRESS
}
