import type { NextApiRequest, NextApiResponse } from 'next'
import { getOptionalStringClaim } from '../auth/_claims'
import { getVerifiedSessionClaims } from '../auth/_session'

const ALLOWED_METHODS = ['GET', 'POST'] as const

export const config = {
  maxDuration: 120
}

function getSessionSignerServerUrl(req: NextApiRequest) {
  return getVerifiedSessionClaims(req).then((payload) => {
    if (!payload) return undefined
    return getOptionalStringClaim(payload, 'signerServer')?.trim()
  })
}

function buildSignerServerUrl(req: NextApiRequest, baseUrl: string): string {
  const parsedBaseUrl = new URL(baseUrl)
  if (!['http:', 'https:'].includes(parsedBaseUrl.protocol)) {
    throw new Error('Signer server URL must be HTTP(S).')
  }

  const path = Array.isArray(req.query.path) ? req.query.path : []
  const url = new URL(
    path.map(encodeURIComponent).join('/'),
    `${parsedBaseUrl.toString().replace(/\/$/, '')}/`
  )

  Object.entries(req.query).forEach(([key, value]) => {
    if (key === 'path') return
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, item))
      return
    }
    if (typeof value === 'string') url.searchParams.set(key, value)
  })

  return url.toString()
}

function getBearerToken(req: NextApiRequest): string | undefined {
  const { authorization } = req.headers
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim() || undefined
  }

  return undefined
}

function getAccessToken(req: NextApiRequest) {
  const headerToken = getBearerToken(req)
  if (headerToken) return headerToken

  const cookieToken = req.cookies.access_token
  if (cookieToken) return cookieToken

  return undefined
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Cache-Control', 'no-store')

  if (
    !ALLOWED_METHODS.includes(req.method as (typeof ALLOWED_METHODS)[number])
  ) {
    res.setHeader('Allow', ALLOWED_METHODS)
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const accessToken = getAccessToken(req)
  if (!accessToken) {
    return res.status(401).json({ error: 'Signer server login is required.' })
  }

  try {
    const signerServer = await getSessionSignerServerUrl(req)
    if (!signerServer) {
      return res.status(401).json({
        error: 'Signer server is missing from the authenticated session.'
      })
    }

    const targetUrl = buildSignerServerUrl(req, signerServer)
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(req.method === 'POST' ? { 'Content-Type': 'application/json' } : {})
      },
      body: req.method === 'POST' ? JSON.stringify(req.body ?? {}) : undefined
    })
    const text = await response.text()
    const contentType = response.headers.get('content-type')
    if (contentType) res.setHeader('Content-Type', contentType)

    return res.status(response.status).send(text)
  } catch (error) {
    console.error('Signer server proxy failed:', error)
    return res.status(502).json({ error: 'Signer server request failed.' })
  }
}
