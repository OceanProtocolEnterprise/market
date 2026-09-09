---
title: Cookie Policy
description: This cookie policy explains how the Ocean Enterprise Demonstration Market uses cookies and similar technologies.
showLastUpdated: true
---

This Cookie Policy explains how the Ocean Enterprise Demonstration Market uses cookies and similar technologies. This policy should be read alongside our Privacy Policy.

## 1. What are cookies?

A cookie is a small file that stores information on your device. Your web browser downloads it on your first visit to a website. When you return using the same device, the cookie is either sent back to the site that created it (first-party) or to another website it belongs to (third-party).

In this policy, the term "cookies" refers to standard browser cookies as well as web storage (`localStorage` and `sessionStorage`), which serves similar functions. Web storage stays on your device and is not sent along with your requests; `sessionStorage` is deleted automatically when you close the browser tab.

### Cookie Categories

- **Essential cookies:** Strictly necessary for you to browse the website and use its features, such as logging in, connecting a wallet, or remembering a setting you deliberately changed. No consent is required for these.
- **Preference cookies:** Remember settings that are not strictly necessary but make the website more user-friendly.
- **Statistics cookies:** Collect anonymized information about how the website is used, to improve it. We only set these with your consent.
- **Marketing cookies:** Track online activity to deliver advertising. **We do not use marketing cookies.**

## 2. How do we use cookies?

All cookies and web storage entries below are first-party: they are created by this website, for this website, and are never shared with advertisers. Settings cookies are only created when you actually change a default setting or use the related feature — simply visiting the site does not store them — and they are erased again when you return to the default.

### Settings (essential, stored as cookies)

| Name                        | Purpose                                                                                             | Duration                                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `cookieConsentAcknowledged` | Remembers that you have seen and acknowledged the cookie notice, so it is not shown on every visit. | Created when you close the cookie notice. Stored for one year.                                                                |
| `AnalyticsCookieConsent`    | Remembers your choice about statistics cookies (accepted or declined).                              | Created when you make a choice in the cookie notice. Stored for one year.                                                     |
| `chainIds`                  | Stores the network(s) you have selected, allowing you to switch the data source of the interface.   | Created if you change the default network selection. Stored for one year, or erased immediately if you return to the default. |
| `bookmarks`                 | Stores your bookmarked assets.                                                                      | Created if you bookmark assets. Stored for one year, or erased immediately if you remove all your bookmarks.                  |
| `allowExternalContent`      | Stores whether the portal is allowed to load and display external content.                          | Created if you allow external content. Stored for 60 days, or erased immediately if you return to the default (do not allow). |
| `debug`                     | Stores whether debug mode is enabled, allowing you to use the debug feature.                        | Created if you activate debug mode. Stored for 60 days, or erased immediately if you deactivate it.                           |
| `onboardingModule`          | Stores whether the onboarding module is shown, so you can hide or re-enable the onboarding feature. | Created if you change the default setting. Stored for 60 days, or erased immediately if you return to the default.            |
| `onboardingStep`            | Stores your current step in the onboarding process, so you can continue where you left off.         | Created once you progress past the first step. Stored for 60 days, or erased immediately when you are back at step 0.         |
| `assetView`                 | Stores whether you prefer the grid or list view for asset lists.                                    | Created if you switch away from the default grid view. Stored for 60 days, or erased immediately if you switch back.          |

### Signing in and wallet connections (essential, web storage)

| Name                                                                                   | Purpose                                                                                                                        | Duration                                                                                                         |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `oidc_session`, `auth_meta`, `token_expires_at`                                        | Keep you logged in to your account and remember when your login needs to be renewed.                                           | `localStorage`; removed when you log out or your login session ends.                                             |
| `sessionToken`                                                                         | Keeps you signed in to your SSI wallet so you do not have to unlock it again on every action.                                  | `localStorage`; stored until the token expires or you disconnect the wallet or log out.                          |
| `cachedCredentials`                                                                    | Caches your verifiable credentials so you do not have to present them again each time.                                         | `localStorage`; deleted when you disconnect the SSI wallet, log out, or your session expires.                    |
| `credentialSelectionStorage`                                                           | Remembers which of your credentials you selected during a credential check.                                                    | `localStorage`; deleted together with `cachedCredentials` on disconnect or logout.                               |
| `verifierSessionId`                                                                    | Stores verification session IDs after you pass a credential check, so you can download or start a job without verifying again. | `localStorage`; each entry is stored for at most one day, and everything is deleted on disconnect or logout.     |
| `credential_<assetId>_<serviceId>`                                                     | Stores the time of a successful credential check for an asset, to show you a "valid for X more minutes" countdown.             | `localStorage`; saved while you interact with an asset and removed when the check is reset or no longer valid.   |
| `wagmi.store`, `wagmi.recentConnectorId`                                               | Remember your wallet connection state (connected account, network) and the last wallet type you used, enabling auto-reconnect. | `localStorage`; kept while the wallet is connected so it can reconnect; cleared when you disconnect.             |
| `dfns_username`                                                                        | Remembers the username of your DFNS wallet so it can be reconnected.                                                           | `localStorage`; stored until you clear your browser storage.                                                     |
| `auth_callback_url`, `auth_mode`, `oidc_logout_pending`                                | Temporarily remember where to return to and which sign-in method you used while a login or logout is in progress.              | `sessionStorage`; removed after the sign-in or sign-out completes, at the latest when you close the browser tab. |
| `signer_server_connected`, `signer_server_selected_chain_id`, `dfns_selected_chain_id` | Temporarily remember which wallet service and network you connected through.                                                   | `sessionStorage`; deleted when you close the browser tab.                                                        |
| `ssiWalletApiOverride`                                                                 | Stores an SSI wallet API address you entered manually.                                                                         | `sessionStorage`; deleted when you close the browser tab.                                                        |

### Using compute features (essential, web storage)

| Name                              | Purpose                                                                                                    | Duration                                                                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `compute-rerun:<jobId>`           | Passes a finished job's setup (algorithm and dataset IDs) along, to prefill the form when you rerun a job. | `localStorage`; stored only for a few seconds after selecting "rerun" for a compute job, then removed automatically.     |
| `computeOutputEncryption:<jobId>` | Stores the key needed to decrypt the results of your own compute job, so you can open them later.          | `localStorage`; stored until you clear your browser storage — without it, encrypted job results can no longer be opened. |

### Statistics (only with your consent)

If you consent to statistics cookies in the cookie notice, we use PostHog, a privacy-friendly product analytics service, to understand how the marketplace is used (for example, which pages are visited). This information is aggregated and anonymized and is used exclusively by us to improve the website.

| Name   | Purpose                                                                                          | Duration                                                                                                                    |
| ------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `ph_*` | PostHog cookies and web storage used to recognize returning visits and collect usage statistics. | Only set after you consent; removed again if you withdraw your consent in the cookie settings. Cookies last up to one year. |

If you do not consent, no statistics cookies or storage are created and nothing is sent to PostHog.

## 3. External Data Transfers

While not all are "cookies," the following services receive data during your use of the market:

- SSI Wallet API: Processes wallet addresses and credential IDs during verification.
- Ocean Node: Receives DIDs and consumer addresses for asset downloads or compute jobs, processes search and filter queries.
- IPFS (Pinata/Gateways): Used for pinning and retrieving decentralized content.
- PostHog (only with your consent): Receives anonymized usage statistics.

## 4. How to block or delete cookies

- Changing your consent: You can reopen the cookie settings at any time via the "Cookie Settings" link in the footer and change your choice about statistics cookies.
- Removing cookies: You can delete all cookies or site-specific cookies via your browser settings at any time.
- Blocking cookies: Most browsers allow you to prevent cookies from being placed. Please note that blocking essential cookies and web storage will prevent logging in, wallet connections, and asset access from functioning.

## 5. Changes to this cookie policy

This policy may be amended from time to time. The "Last updated" date at the top indicates the most recent changes. Material changes will be notified via a prominent notice on the demonstration market.
