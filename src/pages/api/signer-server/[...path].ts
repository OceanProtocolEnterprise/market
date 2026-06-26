import type { NextApiRequest, NextApiResponse } from 'next'
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '../auth/_cookies'
import { getOptionalStringClaim } from '../auth/_claims'
import { getVerifiedSessionClaims } from '../auth/_session'

const ALLOWED_METHODS = ['GET', 'POST'] as const
const SIGNER_SERVER_API_PREFIX = ['api', 'v1'] as const

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
  const normalizedBasePath = parsedBaseUrl.pathname
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean)
  const hasApiPrefixInBase =
    normalizedBasePath.slice(-SIGNER_SERVER_API_PREFIX.length).join('/') ===
    SIGNER_SERVER_API_PREFIX.join('/')
  const hasApiPrefixInPath =
    path.slice(0, SIGNER_SERVER_API_PREFIX.length).join('/') ===
    SIGNER_SERVER_API_PREFIX.join('/')
  const targetPath =
    hasApiPrefixInBase || hasApiPrefixInPath
      ? path
      : [...SIGNER_SERVER_API_PREFIX, ...path]
  const url = new URL(
    targetPath.map(encodeURIComponent).join('/'),
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

function getHeaderValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] || '' : value || ''
}

function getRequestOrigin(req: NextApiRequest): string {
  const host = getHeaderValue(req.headers.host)
  const forwardedProto = getHeaderValue(req.headers['x-forwarded-proto'])
  const protocol = forwardedProto.split(',')[0]?.trim() || 'https'

  return `${protocol}://${host}`
}

function isAllowedOrigin(req: NextApiRequest) {
  const origin = getHeaderValue(req.headers.origin)
  if (!origin) return true
  return origin === getRequestOrigin(req)
}

function hasValidCsrfToken(req: NextApiRequest) {
  if (req.method !== 'POST') return true

  const cookieToken = req.cookies[CSRF_COOKIE_NAME]
  const headerToken = getHeaderValue(req.headers[CSRF_HEADER_NAME])

  return Boolean(cookieToken && headerToken && cookieToken === headerToken)
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

  if (!isAllowedOrigin(req) || !hasValidCsrfToken(req)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const accessToken = req.cookies.access_token
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
