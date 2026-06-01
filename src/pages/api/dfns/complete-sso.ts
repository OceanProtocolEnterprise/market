import type { NextApiRequest, NextApiResponse } from 'next'
import {
  getDfnsApiUrl,
  serializeDfnsTokenCookie
} from '@utils/dfnsServerConfig'

const DFNS_TOKEN_MAX_AGE = 24 * 60 * 60

type CompleteSsoResponse = {
  token?: string
  message?: string
  error?: string
}

function getSingleQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

async function readDfnsResponse(
  response: Response
): Promise<CompleteSsoResponse> {
  return response.json().catch(() => ({})) as Promise<CompleteSsoResponse>
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
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code, state })
    })
    const data = await readDfnsResponse(response)

    if (!response.ok || !data.token) {
      console.error('Dfns SSO completion rejected:', {
        status: response.status,
        statusText: response.statusText,
        body: data
      })
      throw new Error(
        data.message || data.error || 'Failed to complete Dfns SSO login'
      )
    }

    res.setHeader(
      'Set-Cookie',
      serializeDfnsTokenCookie(data.token, DFNS_TOKEN_MAX_AGE)
    )

    return res.redirect(302, '/auth/login?dfns=success')
  } catch (error) {
    console.error('Dfns SSO completion failed:', error)
    return res.redirect(302, '/auth/login?dfns=sso_completion_failed')
  }
}
