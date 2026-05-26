// pages/api/dfns/initiate-sso.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { DFNS_CONFIG } from '../../../@lib/dfns'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('=== Initiate SSO Request ===')
    console.log('Config:', {
      baseUrl: DFNS_CONFIG.baseUrl,
      orgId: DFNS_CONFIG.orgId,
      clientId: DFNS_CONFIG.clientId,
      redirectUri: DFNS_CONFIG.redirectUri
    })

    const requestBody = {
      orgId: DFNS_CONFIG.orgId,
      clientId: DFNS_CONFIG.clientId,
      redirectUri: DFNS_CONFIG.redirectUri
    }

    console.log('Request body:', requestBody)

    const response = await fetch(`${DFNS_CONFIG.baseUrl}/auth/login/sso/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    console.log('Response status:', response.status)
    console.log('Response status text:', response.statusText)

    const data = await response.json()
    console.log('Response data:', data)

    if (!response.ok) {
      console.error('Dfns API error details:', {
        status: response.status,
        statusText: response.statusText,
        data
      })
      throw new Error(
        data.message || `Failed to initiate SSO login: ${response.status}`
      )
    }

    if (!data.ssoRedirectUrl) {
      throw new Error('No ssoRedirectUrl in response')
    }

    return res.status(200).json({
      ssoRedirectUrl: data.ssoRedirectUrl
    })
  } catch (error) {
    console.error('Initiate SSO error details:', error)
    return res.status(500).json({
      error: 'Failed to initiate SSO login',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
