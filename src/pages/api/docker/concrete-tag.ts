import axios from 'axios'
import type { NextApiRequest, NextApiResponse } from 'next'

const SUPPORTED_PRESET_IMAGES = new Set(['node', 'python'])
const CACHE_TTL_MS = 5 * 60 * 1000
const MAX_TAG_PAGES = 3
const concreteTagCache = new Map<
  string,
  { expiresAt: number; tag: string; checksum: string }
>()

interface DockerHubImage {
  architecture?: string
  digest?: string
  os?: string
}

interface DockerHubTag {
  images?: DockerHubImage[]
  name?: string
}

function getLinuxAmd64Digest(tag: DockerHubTag): string | undefined {
  return tag.images?.find(
    (image) => image.architecture === 'amd64' && image.os === 'linux'
  )?.digest
}

function compareSemanticVersions(left: string, right: string): number {
  const leftParts = left.split('.').map(Number)
  const rightParts = right.split('.').map(Number)

  for (let index = 0; index < 3; index++) {
    if (leftParts[index] !== rightParts[index]) {
      return rightParts[index] - leftParts[index]
    }
  }
  return 0
}

async function resolveConcreteTag(
  image: string
): Promise<{ tag: string; checksum: string }> {
  const cached = concreteTagCache.get(image)
  if (cached && cached.expiresAt > Date.now()) {
    return { tag: cached.tag, checksum: cached.checksum }
  }

  const repositoryUrl = `https://hub.docker.com/v2/repositories/library/${image}/tags`
  const latestResponse = await axios.get<DockerHubTag>(
    `${repositoryUrl}/latest`
  )
  const latestDigest = getLinuxAmd64Digest(latestResponse.data)
  if (!latestDigest) {
    throw new Error(
      `Could not resolve the Linux/amd64 digest for ${image}:latest.`
    )
  }

  const matchingVersionTags: string[] = []
  for (let page = 1; page <= MAX_TAG_PAGES; page++) {
    const tagsResponse = await axios.get<{ results?: DockerHubTag[] }>(
      repositoryUrl,
      {
        params: {
          ordering: 'last_updated',
          page,
          page_size: 100
        }
      }
    )

    for (const tag of tagsResponse.data.results || []) {
      if (!tag.name || !/^\d+\.\d+\.\d+$/.test(tag.name)) continue
      if (getLinuxAmd64Digest(tag) === latestDigest) {
        matchingVersionTags.push(tag.name)
      }
    }

    if (matchingVersionTags.length > 0) break
  }

  const concreteTag = matchingVersionTags.sort(compareSemanticVersions)[0]
  if (!concreteTag) {
    throw new Error(
      `Could not find a stable version tag matching ${image}:latest.`
    )
  }

  const result = { tag: concreteTag, checksum: latestDigest }
  concreteTagCache.set(image, {
    ...result,
    expiresAt: Date.now() + CACHE_TTL_MS
  })
  return result
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

  if (!SUPPORTED_PRESET_IMAGES.has(image) || tag !== 'latest') {
    return res.status(400).json({
      success: false,
      error: 'Only the node:latest and python:latest presets are supported.'
    })
  }

  try {
    const result = await resolveConcreteTag(image)
    return res.status(200).json({ success: true, result })
  } catch (error) {
    return res.status(502).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Could not resolve a concrete Docker tag.'
    })
  }
}
