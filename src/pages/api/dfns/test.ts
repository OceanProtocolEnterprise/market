// pages/api/dfns/test.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { DFNS_CONFIG } from '../../../@lib/dfns'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Test basic connectivity
    const testResponse = await fetch(
      `${DFNS_CONFIG.baseUrl}/auth/login/sso/init`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orgId: DFNS_CONFIG.orgId,
          clientId: DFNS_CONFIG.clientId,
          redirectUri: DFNS_CONFIG.redirectUri
        })
      }
    )

    const testData = await testResponse.json()

    return res.status(200).json({
      status: testResponse.status,
      data: testData,
      config: {
        baseUrl: DFNS_CONFIG.baseUrl,
        orgId: DFNS_CONFIG.orgId,
        clientId: DFNS_CONFIG.clientId
          ? `${DFNS_CONFIG.clientId.substring(0, 10)}...`
          : 'missing',
        redirectUri: DFNS_CONFIG.redirectUri
      }
    })
  } catch (error) {
    return res.status(500).json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
