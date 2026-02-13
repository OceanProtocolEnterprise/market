export interface ComputeRerunDatasetSelection {
  did: string
  serviceId?: string
}

export interface ComputeRerunConfig {
  jobId: string
  algorithmDid: string
  algorithmServiceId?: string
  datasets: ComputeRerunDatasetSelection[]
  computeEnv?: string
}

const COMPUTE_RERUN_STORAGE_PREFIX = 'compute-rerun:'

export function getComputeRerunStorageKey(jobId: string): string {
  return `${COMPUTE_RERUN_STORAGE_PREFIX}${jobId}`
}

export function isComputeRerunConfig(
  value: unknown
): value is ComputeRerunConfig {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<ComputeRerunConfig>
  if (!candidate.jobId || !candidate.algorithmDid) return false
  if (!Array.isArray(candidate.datasets)) return false

  const datasetsValid = candidate.datasets.every(
    (dataset) => dataset && typeof dataset.did === 'string'
  )

  return datasetsValid
}
