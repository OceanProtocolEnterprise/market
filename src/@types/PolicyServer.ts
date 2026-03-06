export enum PolicyServerActions {
  INITIATE = 'initiate',
  GET_PD = 'getPD',
  CHECK_SESSION_ID = 'checkSessionId',
  PRESENTATION_REQUEST = 'presentationRequest',
  DOWNLOAD = 'download',
  PASSTHROUGH = 'passthrough'
}

export type PolicyServerPrimitive = string | number | boolean | null

export interface PolicyServerPresentationFieldFilter {
  type?: string
  pattern?: string
  [key: string]: unknown
}

export interface PolicyServerPresentationConstraintField {
  path?: string[]
  filter?: PolicyServerPresentationFieldFilter
  [key: string]: unknown
}

export interface PolicyServerPresentationConstraints {
  fields?: PolicyServerPresentationConstraintField[]
  [key: string]: unknown
}

export interface PolicyServerPresentationDescriptorFormat {
  alg?: string[]
  [key: string]: unknown
}

export interface PolicyServerPresentationInputDescriptor {
  id: string
  format?: Record<string, PolicyServerPresentationDescriptorFormat>
  constraints?: PolicyServerPresentationConstraints
  [key: string]: unknown
}

export interface PolicyServerPresentationDefinition {
  id?: string
  input_descriptors: PolicyServerPresentationInputDescriptor[]
}

export interface PolicyServerPolicyResultsSummary {
  results?: PolicyServerCredentialPolicyResults[]
  time?: string
  policiesRun?: number
}

export interface PolicyServerCheckSessionMessage {
  id?: string
  presentationDefinition?: PolicyServerPresentationDefinition
  tokenResponse?: Record<string, unknown>
  verificationResult?: boolean
  policyResults?: PolicyServerPolicyResultsSummary
  [key: string]: unknown
}

export interface PolicyServerRedirectMessage {
  redirectUri: string
  errorMessage?: string
}

export type PolicyServerInitiateMessage = string | PolicyServerRedirectMessage

export interface PolicyServerResponse {
  success: boolean
  message?: string | PolicyServerCheckSessionMessage
  httpStatus: number
}

export interface PolicyServerPolicyArgs {
  policy_name?: string
  argument?: Record<string, PolicyServerPrimitive>
  [key: string]: unknown
}

export interface PolicyServerPolicyCheckResult {
  policy?: string
  is_success?: boolean
  description?: string
  args?: PolicyServerPolicyArgs | string | number | boolean | null
  error?: string
  result?: Record<string, unknown> | string | number | boolean | null
}

export interface PolicyServerCredentialPolicyResults {
  credential?: string
  policyResults?: PolicyServerPolicyCheckResult[]
}

export interface PolicyServerCheckSessionResponse extends PolicyServerResponse {
  id?: string
  verificationResult?: boolean
  policyResults?: PolicyServerPolicyResultsSummary
}

export interface PolicyServerInitiateActionData {
  sessionId: string
  successRedirectUri: string
  errorRedirectUri: string
  responseRedirectUri: string
  presentationDefinitionUri: string
}

export interface PolicyServerInitiateComputeActionData
  extends PolicyServerInitiateActionData {
  documentId: string
  serviceId: string
}

export interface PolicyServerGetPdAction {
  action: PolicyServerActions.GET_PD
  sessionId: string
}

export interface PolicyServerCheckSessionIdAction {
  action: PolicyServerActions.CHECK_SESSION_ID
  sessionId: string
}
