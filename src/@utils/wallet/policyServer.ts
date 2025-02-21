import axios from 'axios'
import { AssetExtended } from 'src/@types/AssetExtended'
import {
  PolicyServerGetPdAction,
  PolicyServerInitiateAction,
  PolicyServerResponse
} from 'src/@types/PolicyServer'
import appConfig from 'app.config.cjs'

export async function requestCredentialPresentation(
  asset: AssetExtended
): Promise<PolicyServerResponse> {
  try {
    const apiUrl = `${window.location.origin}`

    const action: PolicyServerInitiateAction = {
      action: 'initiate',
      sessionId: '',
      ddo: asset,
      policyServer: {
        successRedirectUri: `${apiUrl}/api/verify`,
        errorRedirectUri: `${apiUrl}/api/verify`,
        responseRedirectUri: `${apiUrl}/api/verify`,
        presentationDefinitionUri: `${apiUrl}/api/pd`
      }
    }
    const response = await axios.post(
      `/provider/api/services/PolicyServerPassthrough`,
      {
        policyServerPassthrough: action
      }
    )
    return response.data
  } catch (error) {
    throw error.response
  }
}

export async function requestPresentationDefinition(
  state: string,
  presentationDefinitionUri: string
): Promise<PolicyServerResponse> {
  try {
    const response = await axios.get(`${presentationDefinitionUri}/${state}`)
    return response.data
  } catch (error) {
    throw error.response
  }
}

export async function serverSideRequestPresentationDefinition(
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

export function extractURLSearchParams(
  urlString: string
): Record<string, string> {
  const url = new URL(urlString)
  const { searchParams } = url
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => (params[key] = value))
  return params
}
