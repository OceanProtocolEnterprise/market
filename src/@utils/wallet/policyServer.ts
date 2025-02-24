/* eslint-disable camelcase */
import axios from 'axios'
import { AssetExtended } from 'src/@types/AssetExtended'
import {
  PolicyServerGetPdAction,
  PolicyServerInitiateAction,
  PolicyServerResponse,
  PolicyServerPresentationRequestAction,
  PolicyServerCheckSessionIdAction
} from 'src/@types/PolicyServer'
import appConfig from 'app.config.cjs'

export async function requestCredentialPresentation(
  asset: AssetExtended
): Promise<string> {
  try {
    const apiUrl = `${window.location.origin}`

    const sessionId = crypto.randomUUID()

    const action: PolicyServerInitiateAction = {
      action: 'initiate',
      sessionId,
      ddo: asset,
      policyServer: {
        successRedirectUri: `${apiUrl}/api/verify/success`,
        errorRedirectUri: `${apiUrl}/api/verify/error`,
        responseRedirectUri: `${apiUrl}/api/verify/${sessionId}`,
        presentationDefinitionUri: `${apiUrl}/api/pd/${sessionId}`
      }
    }
    const response = await axios.post(
      `/provider/api/services/PolicyServerPassthrough`,
      {
        policyServerPassthrough: action
      }
    )
    return response.data.message
  } catch (error) {
    throw error.response
  }
}

export async function serverSidePresentationDefinition(
  sessionId: string
): Promise<PolicyServerResponse> {
  try {
    const action: PolicyServerGetPdAction = {
      action: 'getPD',
      sessionId
    }

    const response = await axios.post(
      `${appConfig.customProviderUrl}/api/services/PolicyServerPassthrough`,
      {
        policyServerPassthrough: action
      }
    )

    return response.data
  } catch (error) {
    throw error.response
  }
}

export async function serverSidePresentationRequest(
  sessionId: string,
  vp_token: string
): Promise<PolicyServerResponse> {
  try {
    const action: PolicyServerPresentationRequestAction = {
      action: 'presentationRequest',
      sessionId,
      vp_token,
      response: null,
      presentation_submission: null
    }

    const response = await axios.post(
      `${appConfig.customProviderUrl}/api/services/PolicyServerPassthrough`,
      {
        policyServerPassthrough: action
      }
    )

    return response.data
  } catch (error) {
    throw error.response
  }
}

export async function checkSessionId(sessionId: string): Promise<string> {
  try {
    const apiUrl = `${window.location.origin}`

    const action: PolicyServerCheckSessionIdAction = {
      action: 'checkSessionId',
      sessionId
    }
    const response = await axios.post(
      `/provider/api/services/PolicyServerPassthrough`,
      {
        policyServerPassthrough: action
      }
    )
    console.log(response.data)
    return response.data.message
  } catch (error) {
    throw error.response
  }
}
