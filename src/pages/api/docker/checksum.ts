import axios from 'axios'
import type { NextApiRequest, NextApiResponse } from 'next'

const DOCKER_AUTH_URL = 'https://auth.docker.io/token'
const DOCKER_REGISTRY_URL = 'https://registry-1.docker.io'
const DOCKER_TAG_PATTERN = /^[\w][\w.-]{0,127}$/
const DOCKER_REPOSITORY_PART_PATTERN = /^[a-z0-9._-]+$/
const DOCKER_DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/i

interface DockerTokenResponse {
  access_token?: string
  token?: string
}

interface DockerManifestDescriptor {
  digest?: string
  platform?: {
    architecture?: string
    os?: string
  }
}

interface DockerManifestResponse {
  config?: {
    digest?: string
  }
  manifests?: DockerManifestDescriptor[]
}

function normalizeDockerHubRepository(image: string): string | undefined {
  if (
    !image ||
    image.length > 255 ||
    image.startsWith('/') ||
    image.endsWith('/')
  ) {
    return undefined
  }

  const parts = image.split('/')
  if (
    parts.some(
      (part) =>
        !DOCKER_REPOSITORY_PART_PATTERN.test(part) ||
        !/[a-z0-9]/.test(part[0]) ||
        !/[a-z0-9]/.test(part[part.length - 1])
    ) ||
    (parts.length > 1 &&
      (parts[0].includes('.') ||
        parts[0].includes(':') ||
        parts[0] === 'localhost'))
  ) {
    return undefined
  }

  return parts.length === 1 ? `library/${image}` : image
}

function getLinuxAmd64PlatformDigest(
  response: DockerManifestResponse
): string | undefined {
  const digest = response.manifests?.find(
    (manifest) =>
      manifest.platform?.architecture === 'amd64' &&
      manifest.platform?.os === 'linux'
  )?.digest

  return typeof digest === 'string' && DOCKER_DIGEST_PATTERN.test(digest)
    ? digest
    : undefined
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4kb'
    }
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  let body: Record<string, unknown>
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid JSON body' })
  }

  const image = typeof body?.image === 'string' ? body.image.trim() : ''
  const tag = typeof body?.tag === 'string' ? body.tag.trim() : ''
  const username =
    typeof body?.username === 'string' ? body.username.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const repository = normalizeDockerHubRepository(image)

  if (!repository || !DOCKER_TAG_PATTERN.test(tag)) {
    return res.status(400).json({
      success: false,
      error: 'Enter a valid Docker Hub image and tag.'
    })
  }
  if (
    !username ||
    !password ||
    username.length > 256 ||
    password.length > 4096
  ) {
    return res.status(400).json({
      success: false,
      error: 'Docker Hub username and access token are required.'
    })
  }

  try {
    const tokenResponse = await axios.get<DockerTokenResponse>(
      DOCKER_AUTH_URL,
      {
        auth: { username, password },
        params: {
          service: 'registry.docker.io',
          scope: `repository:${repository}:pull`
        },
        maxRedirects: 0,
        timeout: 15_000
      }
    )
    const token = tokenResponse.data.token || tokenResponse.data.access_token
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Docker Hub authentication failed.'
      })
    }

    const manifestResponse = await axios.get<DockerManifestResponse>(
      `${DOCKER_REGISTRY_URL}/v2/${repository}/manifests/${encodeURIComponent(
        tag
      )}`,
      {
        headers: {
          Accept: [
            'application/vnd.oci.image.index.v1+json',
            'application/vnd.docker.distribution.manifest.list.v2+json',
            'application/vnd.oci.image.manifest.v1+json',
            'application/vnd.docker.distribution.manifest.v2+json'
          ].join(', '),
          Authorization: `Bearer ${token}`
        },
        maxContentLength: 2 * 1024 * 1024,
        maxRedirects: 0,
        timeout: 15_000
      }
    )
    let checksum = getLinuxAmd64PlatformDigest(manifestResponse.data)

    if (!manifestResponse.data.manifests?.length) {
      const configDigest = manifestResponse.data.config?.digest
      const manifestDigest = manifestResponse.headers['docker-content-digest']

      if (
        typeof configDigest === 'string' &&
        DOCKER_DIGEST_PATTERN.test(configDigest) &&
        typeof manifestDigest === 'string' &&
        DOCKER_DIGEST_PATTERN.test(manifestDigest)
      ) {
        const configResponse = await axios.get<{
          architecture?: string
          os?: string
        }>(`${DOCKER_REGISTRY_URL}/v2/${repository}/blobs/${configDigest}`, {
          headers: { Authorization: `Bearer ${token}` },
          maxContentLength: 2 * 1024 * 1024,
          maxRedirects: 3,
          timeout: 15_000
        })

        if (
          configResponse.data.architecture === 'amd64' &&
          configResponse.data.os === 'linux'
        ) {
          checksum = manifestDigest
        }
      }
    }

    if (!checksum) {
      return res.status(422).json({
        success: false,
        error: 'The Docker image does not include a Linux/amd64 manifest.'
      })
    }

    return res.status(200).json({ success: true, result: { checksum } })
  } catch (error) {
    const status = axios.isAxiosError(error)
      ? error.response?.status
      : undefined
    if (status === 401 || status === 403) {
      return res.status(401).json({
        success: false,
        error:
          'Docker Hub authentication failed. Check the username and read-only access token.'
      })
    }
    if (status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Docker image or tag not found.'
      })
    }

    return res.status(502).json({
      success: false,
      error: 'Docker Hub could not resolve this image checksum.'
    })
  }
}
