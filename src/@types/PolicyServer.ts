export enum PolicyServerActions {
  INITIATE = 'initiate',
  GET_PD = 'getPD',
  CHECK_SESSION_ID = 'checkSessionId',
  PRESENTATION_REQUEST = 'presentationRequest',
  DOWNLOAD = 'download',
  PASSTHROUGH = 'passthrough'
}

export interface PolicyServerResponse {
  success: boolean
  message: string
  httpStatus: number
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

export interface PolicyServerPresentationDefinition {
  input_descriptors: any[]
}
