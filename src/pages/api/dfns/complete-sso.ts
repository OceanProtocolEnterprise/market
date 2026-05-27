// pages/api/dfns/complete-sso.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { DFNS_CONFIG } from '../../../@lib/dfns'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { code, state } = req.query

    if (!code || !state) {
      return res.redirect(`/dfns-login?error=missing_auth_params`)
    }

    const response = await fetch(`${DFNS_CONFIG.baseUrl}/auth/login/sso`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code,
        state
      })
    })
    console.log('Complete SSO response status:', code)
    console.log('Complete SSO response status text:', response)
    console.log('Complete SSO response state:', state)
    const data = await response.json()
    console.log('Complete SSO response data:', data)

    if (!response.ok) {
      throw new Error(data.message || 'Failed to complete SSO login')
    }

    if (!data.token) {
      throw new Error('No token received from Dfns')
    }

    res.setHeader(
      'Set-Cookie',
      `dfns_token=${data.token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax`
    )

    return res.redirect(`/dfns-login?success=true`)
  } catch (error) {
    console.error('Complete SSO error:', error)
    return res.redirect(`/dfns-login?error=sso_completion_failed`)
  }
}
