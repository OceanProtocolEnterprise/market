---
title: Cookie Policy
description: This cookie policy explains how the Ocean Enterprise Demonstration Market uses cookies and similar technologies.
showLastUpdated: true
---

This Cookie Policy explains how the Ocean Enterprise Demonstration Market uses cookies and similar technologies. This policy should be read alongside our Privacy Policy.

## 1. What are cookies?

A cookie is a small file that stores information on your device. Your web browser downloads it on your first visit to a website. When you return using the same device, the cookie is either sent back to the site that created it (first-party) or to another website it belongs to (third-party).

In this policy, the term "cookies" refers to standard browser cookies, as well as web storage (`localStorage` and `sessionStorage`) and `IndexedDB`, which serve similar functions.

### Cookie Categories

- Essential cookies: Strictly necessary for you to browse the website and use features like wallet connections.
- Preference cookies: Used to remember your settings (e.g., currency or selected chains) to improve user-friendliness.
- Statistics cookies: Collect information about how you use the website to improve functions.
- Marketing cookies: Track activity to deliver relevant content or advertising.

## 2. How do we use cookies?

We use essential and preference-based first-party storage to ensure the portal functions correctly. Currently, optional cookie categories (statistics/marketing) are not active in the user interface.

| Name / Key                  | Service          | Purpose                                                             | Type and Duration                    |
| --------------------------- | ---------------- | ------------------------------------------------------------------- | ------------------------------------ |
| `wagmi.store`               | wagmi/connectkit | Stores wallet connection state (chain, connector, account mapping). | Cookie; session-based.               |
| `ocean-user-preferences-v4` | Ocean App        | Stores currency, selected chains, bookmarks, and onboarding flags.  | `localStorage`; persistent.          |
| `sessionToken`              | SSI Auth         | Stores SSI session token (session ID, bearer token, expiration).    | `localStorage`; persistent.          |
| `cachedCredentials`         | SSI Flow         | Caches verifiable credentials per DID to speed up access.           | `localStorage`; persistent.          |
| `credential_<assetId>`      | Access Control   | Stores timestamp of successful credential checks.                   | `localStorage`; persistent.          |
| `compute-rerun:<jobId>`     | Compute          | Stores rerun payloads for compute history.                          | `localStorage`; persistent.          |
| `ssiWalletApiOverride`      | SSI Auth         | Stores user-entered SSI API base URL overrides.                     | `sessionStorage`; ends with session. |
| `wc@2:*`                    | WalletConnect    | Persistence for WalletConnect client sessions.                      | `localStorage` and `IndexedDB`.      |

## 3. External Data Transfers

While not all are "cookies," the following services receive data during your use of the market:

- SSI Wallet API: Processes wallet addresses and credential IDs during verification.
- Ocean Node: Receives DIDs and consumer addresses for asset downloads or compute jobs, processes search and filter queries.
- IPFS (Pinata/Gateways): Used for pinning and retrieving decentralized content.

## 4. How to block or delete cookies

- Removing cookies: You can delete all cookies or site-specific cookies via your browser settings at any time.
- Blocking cookies: Most browsers allow you to prevent cookies from being placed. Please note that blocking essential cookies will prevent wallet connections and asset access from functioning.

## 5. Changes to this cookie policy

This policy may be amended from time to time. The "Last updated" date at the top indicates the most recent changes. Material changes will be notified via a prominent notice on the demonstration market.
