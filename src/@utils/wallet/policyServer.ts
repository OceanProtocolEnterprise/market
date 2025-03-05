/* eslint-disable camelcase */
import axios from 'axios'
import { AssetExtended } from 'src/@types/AssetExtended'
import {
  PolicyServerInitiateAction,
  PolicyServerResponse,
  PolicyServerCheckSessionIdAction
} from 'src/@types/PolicyServer'

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
        successRedirectUri: `${apiUrl}/api/policy/success`,
        errorRedirectUri: `${apiUrl}/api/policy/error`,
        responseRedirectUri: `${apiUrl}/policy/verify/${sessionId}`,
        presentationDefinitionUri: `${apiUrl}/policy/pd/${sessionId}`
      }
    }
    const response = await axios.post(
      `/provider/api/services/PolicyServerPassthrough`,
      {
        policyServerPassthrough: action
      }
    )

    if (!response.data?.message) {
      // eslint-disable-next-line no-throw-literal
      throw { success: false, message: 'No openid4vc url found' }
    }

    return response.data.message
  } catch (error) {
    if (!error.response?.data) {
      throw error.response.data
    }
    throw error
  }
}

export async function checkVerifierSessionId(
  sessionId: string
): Promise<PolicyServerResponse> {
  try {
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
    return response.data
  } catch (error) {
    return error.response.data
  }
}
