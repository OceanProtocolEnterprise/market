import type { NextApiRequest, NextApiResponse } from 'next'
import { getDfnsSsoConfig } from '@utils/dfnsServerConfig'

type InitiateDfnsSsoBody = {
  organizationId?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body as InitiateDfnsSsoBody
    const config = getDfnsSsoConfig(req, {
      orgId: body.organizationId
    })
    console.log('Dfns SSO config:', config)
    const response = await fetch(`${config.apiUrl}/auth/login/sso/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgId: config.orgId,
        clientId: config.clientId,
        redirectUri: config.redirectUri
      })
    })
    const data = (await response.json().catch(() => ({}))) as {
      ssoRedirectUrl?: string
      message?: string
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || 'Failed to initiate Dfns SSO login'
      })
    }

    if (!data.ssoRedirectUrl) {
      return res.status(502).json({
        error: 'Dfns SSO response did not include a redirect URL'
      })
    }

    return res.status(200).json({ ssoRedirectUrl: data.ssoRedirectUrl })
  } catch (error) {
    console.error('Dfns SSO initiation failed:', error)
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Failed to initiate Dfns SSO login'
    })
  }
}
