export type ComputeStartProgressPhase =
  | 'escrow'
  | `dataset:${number}`
  | 'algorithm'
  | 'create'

export type ComputeStartProgressStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'skipped'
  | 'error'

export type ComputeStartProgressStep = {
  id: ComputeStartProgressPhase
  label: string
  shortLabel: string
  status: ComputeStartProgressStatus
}

type ComputeStartProgressAssets = {
  datasets?: Array<{ name?: string }>
  algorithm?: { name?: string }
}

function capitalizeFirstLetter(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value
}

export function getDatasetProgressPhase(
  index: number
): ComputeStartProgressPhase {
  return `dataset:${index}`
}

export function createComputeStartProgress({
  datasets = [],
  algorithm
}: ComputeStartProgressAssets = {}): ComputeStartProgressStep[] {
  return [
    {
      id: 'escrow',
      label: 'Approve and deposit funds in escrow if necessary',
      shortLabel: 'Escrow',
      status: 'pending'
    },
    ...datasets.map(({ name }, index) => ({
      id: getDatasetProgressPhase(index),
      label: `Approve and buy dataset${name ? `: ${name}` : ` ${index + 1}`}`,
      shortLabel: capitalizeFirstLetter(name || `Dataset ${index + 1}`),
      status: 'pending' as const
    })),
    ...(algorithm
      ? [
          {
            id: 'algorithm' as const,
            label: `Approve and buy algorithm${
              algorithm.name ? `: ${algorithm.name}` : ''
            }`,
            shortLabel: capitalizeFirstLetter(algorithm.name || 'Algorithm'),
            status: 'pending' as const
          }
        ]
      : []),
    {
      id: 'create',
      label: 'Creating job in progress',
      shortLabel: 'Create job',
      status: 'pending'
    }
  ]
}
