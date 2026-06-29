export type ComputeStartProgressPhase =
  | 'escrowApproval'
  | 'deposit'
  | 'approvals'
  | 'buy'
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
  status: ComputeStartProgressStatus
}

export const computeStartProgressLabels: Record<
  ComputeStartProgressPhase,
  string
> = {
  escrowApproval: 'Approve escrow funds if necessary',
  deposit: 'Deposit funds in escrow if necessary',
  approvals: 'Token approvals',
  buy: 'Buy datasets and algorithm',
  create: 'Creating job in progress'
}

export function createComputeStartProgress(): ComputeStartProgressStep[] {
  return Object.entries(computeStartProgressLabels).map(([id, label]) => ({
    id: id as ComputeStartProgressPhase,
    label,
    status: 'pending'
  }))
}
