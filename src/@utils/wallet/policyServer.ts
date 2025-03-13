/* eslint-disable camelcase */
import axios from 'axios'
import { AssetExtended } from 'src/@types/AssetExtended'
import {
  PolicyServerInitiateAction,
  PolicyServerResponse,
  PolicyServerCheckSessionIdAction,
  PolicyServerInitiateActionData
} from 'src/@types/PolicyServer'

export async function requestCredentialPresentation(
  asset: AssetExtended
): Promise<{
  success: boolean
  openid4vc: string
  policyServerData: PolicyServerInitiateActionData
}> {
  try {
    const apiUrl = `${window.location.origin}`
    const sessionId = crypto.randomUUID()

    const policyServer: PolicyServerInitiateActionData = {
      successRedirectUri: `${apiUrl}/api/policy/success`,
      errorRedirectUri: `${apiUrl}/api/policy/error`,
      responseRedirectUri: `${apiUrl}/policy/verify/${sessionId}`,
      presentationDefinitionUri: `${apiUrl}/policy/pd/${sessionId}`
    }

    const action: PolicyServerInitiateAction = {
      action: 'initiate',
      sessionId,
      ddo: asset,
      policyServer
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

    return {
      success: response.data?.success,
      openid4vc: response.data?.message,
      policyServerData: policyServer
    }
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
    if (error.response?.data) {
      throw error.response?.data
    }
    throw error
  }
}
