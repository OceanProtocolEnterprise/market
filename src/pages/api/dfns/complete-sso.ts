import type { NextApiRequest, NextApiResponse } from 'next'
import {
  getDfnsApiUrl,
  serializeDfnsTokenCookie
} from '@utils/dfnsServerConfig'

const DFNS_TOKEN_MAX_AGE = 24 * 60 * 60

function getSingleQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const code = getSingleQueryValue(req.query.code)
  const state = getSingleQueryValue(req.query.state)

  if (!code || !state) {
    return res.redirect(302, '/auth/login?dfns=missing_auth_params')
  }

  try {
    const response = await fetch(`${getDfnsApiUrl()}/auth/login/sso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state })
    })
    console.log('response login:', response)
    const data = (await response.json().catch(() => ({}))) as {
      token?: string
      message?: string
    }

    if (!response.ok || !data.token) {
      throw new Error(data.message || 'Failed to complete Dfns SSO login')
    }

    console.log('Dfns SSO login successful:', data)
    // res.setHeader(
    //   'Set-Cookie',
    //   serializeDfnsTokenCookie(data.token, DFNS_TOKEN_MAX_AGE)
    // )
    res.setHeader(
      'Set-Cookie',
      `dfns_token=${data.token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax`
    )

    return res.redirect(302, '/auth/login?dfns=success')
  } catch (error) {
    console.error('Dfns SSO completion failed:', error)
    return res.redirect(302, '/auth/login?dfns=sso_completion_failed')
  }
}
