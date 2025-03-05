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

    if (response.data.length === 0) {
      // eslint-disable-next-line no-throw-literal
      throw { success: false, message: 'No openid4vc url found' }
    }

    return response.data?.message
  } catch (error) {
    if (error.response?.data) {
      throw error.response?.data
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

    if (typeof response.data === 'string' && response.data.length === 0) {
      // eslint-disable-next-line no-throw-literal
      throw { success: false, message: 'Invalid session id' }
    }

    return response.data
  } catch (error) {
    console.log(error)
    if (error.response?.data) {
      throw error.response?.data
    }
    throw error
  }
}
