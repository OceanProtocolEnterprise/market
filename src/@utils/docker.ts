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
