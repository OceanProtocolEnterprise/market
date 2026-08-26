import { getHash } from '@oceanprotocol/lib'
import { Asset } from 'src/@types/Asset'
import { PublisherTrustedAlgorithms, Service } from 'src/@types/ddo/Service'
import { getContainerChecksum } from './docker'

export const CONTAINER_UPDATE_REQUIRED_MESSAGE =
  'The latest Docker image changed. The algorithm owner must update the algorithm metadata, and the dataset owner must refresh the selected algorithm checksums.'

export interface LatestContainerUpdateStatus {
  isLatest: boolean
  updateRequired: boolean
  resolvedChecksum?: string
}

export function getExplicitTrustedAlgorithm(
  datasetService: Service,
  algorithmDid: string,
  algorithmServiceId?: string
): PublisherTrustedAlgorithms | undefined {
  return datasetService.compute?.publisherTrustedAlgorithms?.find(
    (entry) =>
      entry.did === algorithmDid &&
      (!algorithmServiceId ||
        entry.serviceId === algorithmServiceId ||
        entry.serviceId === '*')
  )
}

export function hasTrustedContainerChanged(
  trustedAlgorithm: PublisherTrustedAlgorithms,
  algorithm: Asset
): boolean {
  if (trustedAlgorithm.containerSectionChecksum === '*') return false

  const container = algorithm.credentialSubject?.metadata?.algorithm?.container
  if (!container) return false

  return (
    trustedAlgorithm.containerSectionChecksum !==
    getHash(container.entrypoint + container.checksum)
  )
}

async function checkLatestAlgorithmContainer(
  algorithm: Asset
): Promise<LatestContainerUpdateStatus> {
  const container = algorithm.credentialSubject?.metadata?.algorithm?.container
  if (!container || container.tag !== 'latest') {
    return { isLatest: false, updateRequired: false }
  }

  const context = {
    algorithmDid: algorithm.id,
    image: container.image,
    tag: container.tag,
    storedChecksum: container.checksum
  }
  console.info('[C2D container check] Checking allowlisted algorithm', context)

  const containerInfo = await getContainerChecksum(
    container.image,
    container.tag
  )
  if (!containerInfo.checksum) {
    console.error(
      '[C2D container check] Could not resolve container digest',
      context
    )
    return { isLatest: true, updateRequired: false }
  }

  const updateRequired = containerInfo.checksum !== container.checksum
  const resultContext = {
    ...context,
    resolvedChecksum: containerInfo.checksum
  }

  if (updateRequired) {
    console.warn(
      '[C2D container check] Container update required',
      resultContext
    )
  } else {
    console.info('[C2D container check] Container is up to date', resultContext)
  }

  return {
    isLatest: true,
    updateRequired,
    resolvedChecksum: containerInfo.checksum
  }
}

export function createLatestContainerUpdateChecker(): (
  algorithm: Asset
) => Promise<LatestContainerUpdateStatus> {
  const checks = new Map<string, Promise<LatestContainerUpdateStatus>>()

  return (algorithm: Asset) => {
    const container =
      algorithm.credentialSubject?.metadata?.algorithm?.container
    const cacheKey = container
      ? `${container.image}:${container.tag}:${container.checksum}`
      : algorithm.id

    const existingCheck = checks.get(cacheKey)
    if (existingCheck) return existingCheck

    const check = checkLatestAlgorithmContainer(algorithm)
    checks.set(cacheKey, check)
    return check
  }
}
