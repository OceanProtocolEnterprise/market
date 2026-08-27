import { getHash } from '@oceanprotocol/lib'
import { Asset } from 'src/@types/Asset'
import { PublisherTrustedAlgorithms, Service } from 'src/@types/ddo/Service'

export const CONTAINER_UPDATE_REQUIRED_MESSAGE =
  'The algorithm metadata and dataset allowlist checksums do not match. The algorithm owner must verify the algorithm metadata, and the dataset owner must refresh the selected algorithm checksums.'

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
