import { LoggerInstance } from '@oceanprotocol/lib'
import axios from 'axios'
import { toast } from 'react-toastify'
import { dockerHubProxyUrl } from '../../app.config.cjs'
export interface dockerContainerInfo {
  exists: boolean
  checksum: string
}

export interface DockerImageReference {
  image: string
  tag: string
}

export interface ConcreteDockerImageTag {
  tag: string
  checksum: string
}

const CONCRETE_TAG_CACHE_TTL_MS = 5 * 60 * 1000
const concreteTagRequests = new Map<
  string,
  { expiresAt: number; request: Promise<ConcreteDockerImageTag> }
>()

const dockerTagPattern = /^[\w][\w.-]{0,127}$/

export function parseDockerImageReference(
  reference: string = ''
): DockerImageReference {
  const normalizedReference = reference?.trim()

  if (!normalizedReference) {
    throw new Error('Docker image is required')
  }
  if (/\s/.test(normalizedReference)) {
    throw new Error('Docker image cannot contain whitespace')
  }
  if (normalizedReference.includes('@')) {
    throw new Error(
      'Docker digest references are not supported. Provide the digest in the checksum field.'
    )
  }

  const lastSlashIndex = normalizedReference.lastIndexOf('/')
  const lastColonIndex = normalizedReference.lastIndexOf(':')
  const hasTag = lastColonIndex > lastSlashIndex
  const image = hasTag
    ? normalizedReference.slice(0, lastColonIndex)
    : normalizedReference
  const tag = hasTag ? normalizedReference.slice(lastColonIndex + 1) : ''

  if (!image) {
    throw new Error('Docker image is required')
  }
  if (hasTag && !dockerTagPattern.test(tag)) {
    throw new Error('Docker image tag is invalid')
  }

  return { image, tag }
}

export function normalizeDockerImageReference(
  reference: string = '',
  fallbackTag = ''
): DockerImageReference {
  const parsedReference = parseDockerImageReference(reference)
  const tag = parsedReference.tag || fallbackTag.trim()

  if (!tag) {
    throw new Error('Docker image tag is required')
  }
  if (!dockerTagPattern.test(tag)) {
    throw new Error('Docker image tag is invalid')
  }

  return { image: parsedReference.image, tag }
}

export function resolveDockerImageReferenceForPreview(
  reference: string = '',
  fallbackTag = ''
): DockerImageReference {
  try {
    const parsedReference = parseDockerImageReference(reference)
    return {
      image: parsedReference.image,
      tag: parsedReference.tag || fallbackTag.trim()
    }
  } catch {
    return {
      image: reference.trim(),
      tag: fallbackTag.trim()
    }
  }
}

export async function getContainerChecksum(
  image: string,
  tag: string
): Promise<dockerContainerInfo> {
  const containerInfo: dockerContainerInfo = {
    exists: false,
    checksum: null
  }
  try {
    const response = await axios.post(dockerHubProxyUrl, {
      image,
      tag
    })
    if (
      !response ||
      response.status !== 200 ||
      response.data.status !== 'success'
    ) {
      toast.error(
        'Could not fetch docker hub image informations. If you have it hosted in a 3rd party repository please fill in the container checksum manually.'
      )
      return containerInfo
    }
    containerInfo.exists = true
    containerInfo.checksum = response.data.result.checksum
    return containerInfo
  } catch (error) {
    LoggerInstance.error(error.message)
    toast.error(
      'Could not fetch docker hub image informations. If you have it hosted in a 3rd party repository please fill in the container checksum manually.'
    )
    return containerInfo
  }
}

export async function getConcreteDockerImageTag(
  image: string,
  tag: string
): Promise<ConcreteDockerImageTag> {
  if (tag !== 'latest') {
    const containerInfo = await getContainerChecksum(image, tag)
    if (!containerInfo.checksum) {
      throw new Error(`Could not resolve the checksum for ${image}:${tag}.`)
    }
    return { tag, checksum: containerInfo.checksum }
  }

  const cacheKey = `${image}:${tag}`
  const cachedRequest = concreteTagRequests.get(cacheKey)
  if (cachedRequest && cachedRequest.expiresAt > Date.now()) {
    return cachedRequest.request
  }

  const request = axios
    .post('/api/docker/concrete-tag', { image, tag })
    .then((response) => {
      const result = response?.data?.result as ConcreteDockerImageTag
      if (!response?.data?.success || !result?.tag || !result?.checksum) {
        throw new Error(
          `Could not resolve a concrete version tag for ${image}:${tag}.`
        )
      }
      return result
    })
    .catch((error) => {
      concreteTagRequests.delete(cacheKey)
      throw error
    })

  concreteTagRequests.set(cacheKey, {
    expiresAt: Date.now() + CONCRETE_TAG_CACHE_TTL_MS,
    request
  })
  return request
}
