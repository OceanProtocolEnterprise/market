/* eslint-disable camelcase */
import { ProviderInstance } from '@oceanprotocol/lib'
import { customProviderUrl } from 'app.config.cjs'
import axios from 'axios'
import { Asset } from 'src/@types/Asset'
import {
  PolicyServerCheckSessionIdAction,
  PolicyServerCheckSessionMessage,
  PolicyServerInitiateActionData,
  PolicyServerInitiateMessage,
  PolicyServerRedirectMessage,
  PolicyServerActions,
  PolicyServerGetPdAction,
  PolicyServerPresentationDefinition,
  PolicyServerCheckSessionResponse,
  PolicyServerCredentialPolicyResults,
  PolicyServerPolicyArgs,
  PolicyServerPrimitive
} from 'src/@types/PolicyServer'

export async function requestCredentialPresentation(
  asset: Asset,
  consumerAddress: string,
  serviceId: string
): Promise<{
  success: boolean
  openid4vc: PolicyServerInitiateMessage
  policyServerData: PolicyServerInitiateActionData
}> {
  try {
    const sessionId =
      typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const policyServer: PolicyServerInitiateActionData = {
      sessionId,
      successRedirectUri: ``,
      errorRedirectUri: ``,
      responseRedirectUri: ``,
      presentationDefinitionUri: ``
    }
    const command = {
      documentId: asset.id,
      serviceId,
      consumerAddress,
      policyServer
    }
    const initializePs = await ProviderInstance.initializePSVerification(
      customProviderUrl,
      command
    )
    return {
      success: initializePs?.success,
      openid4vc: initializePs?.message,
      policyServerData: policyServer
    }
  } catch (error) {
    if (error.request?.response) {
      const err = JSON.parse(error.request.response)
      throw err
    }
    if (error.response?.data) {
      throw error.response?.data
    }
    throw error
  }
}

export function isPolicyServerRedirectMessage(
  value: PolicyServerInitiateMessage
): value is PolicyServerRedirectMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.redirectUri === 'string'
  )
}

export async function checkVerifierSessionId(
  sessionId: string
): Promise<PolicyServerCheckSessionResponse> {
  try {
    const action: PolicyServerCheckSessionIdAction = {
      action: PolicyServerActions.CHECK_SESSION_ID,
      sessionId
    }
    const response = await axios.post(
      `${customProviderUrl}/api/services/PolicyServerPassthrough`,
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

function isPolicyServerPolicyArgs(
  args: unknown
): args is PolicyServerPolicyArgs {
  return typeof args === 'object' && args !== null
}

function isPolicyServerCheckSessionResponse(
  value: unknown
): value is PolicyServerCheckSessionResponse {
  return typeof value === 'object' && value !== null
}

function isPolicyServerCheckSessionMessage(
  value: unknown
): value is PolicyServerCheckSessionMessage {
  return typeof value === 'object' && value !== null
}

function isPrimitiveRecord(
  value: unknown
): value is Record<string, PolicyServerPrimitive> {
  if (typeof value !== 'object' || value === null) return false
  return Object.values(value).every((entry) => {
    return (
      typeof entry === 'string' ||
      typeof entry === 'number' ||
      typeof entry === 'boolean' ||
      entry === null
    )
  })
}

function getPolicyResultsEntries(
  checkSessionResponse: unknown
): PolicyServerCredentialPolicyResults[] {
  if (!isPolicyServerCheckSessionResponse(checkSessionResponse)) return []
  const nestedResults = isPolicyServerCheckSessionMessage(
    checkSessionResponse.message
  )
    ? checkSessionResponse.message.policyResults?.results
    : undefined
  const results = checkSessionResponse.policyResults?.results ?? nestedResults
  if (!Array.isArray(results)) return []
  return results
}

export interface FailedPolicyDetail {
  credential: string
  policy: string
  policyName?: string
  description?: string
  reason?: string
  expectation?: string
}

function extractHumanReadableReason(errorText: unknown): string | undefined {
  if (typeof errorText !== 'string') return undefined
  const firstLine = errorText.split('\n')[0]?.trim()
  if (!firstLine) return undefined
  const withoutExceptionPrefix = firstLine
    .replace(/^.*Exception:\s*/, '')
    .trim()
  return withoutExceptionPrefix || firstLine
}

export function extractFailedPolicyDetails(
  checkSessionResponse: unknown
): FailedPolicyDetail[] {
  const results = getPolicyResultsEntries(checkSessionResponse)
  if (!Array.isArray(results)) return []

  return results.reduce<FailedPolicyDetail[]>((accumulator, entry) => {
    const credential =
      typeof entry?.credential === 'string' && entry.credential.length > 0
        ? entry.credential
        : 'Unknown credential'

    if (!Array.isArray(entry?.policyResults)) return accumulator

    const failedDetails = entry.policyResults
      .filter((policyResult) => policyResult?.is_success === false)
      .map((policyResult) => {
        const policy =
          typeof policyResult?.policy === 'string' &&
          policyResult.policy.length > 0
            ? policyResult.policy
            : 'Unknown policy'
        const policyArgs = isPolicyServerPolicyArgs(policyResult?.args)
          ? policyResult.args
          : undefined
        const policyName =
          typeof policyArgs?.policy_name === 'string'
            ? policyArgs.policy_name
            : undefined
        const description =
          typeof policyResult?.description === 'string'
            ? policyResult.description
            : undefined
        const reason = extractHumanReadableReason(policyResult?.error)
        const argument = policyArgs?.argument
        let expectation: string | undefined
        if (isPrimitiveRecord(argument)) {
          const [key] = Object.keys(argument)
          const value = key ? argument[key] : undefined
          if (
            typeof key === 'string' &&
            (typeof value === 'string' ||
              typeof value === 'number' ||
              typeof value === 'boolean' ||
              value === null)
          ) {
            expectation = `${key}=${String(value)}`
          }
        }

        return {
          credential,
          policy,
          policyName,
          description,
          reason,
          expectation
        }
      })

    return [...accumulator, ...failedDetails]
  }, [])
}

export async function getPd(
  sessionId: string
): Promise<PolicyServerPresentationDefinition> {
  try {
    const action: PolicyServerGetPdAction = {
      action: PolicyServerActions.GET_PD,
      sessionId
    }
    const response = await axios.post(
      `${customProviderUrl}/api/services/PolicyServerPassthrough`,
      {
        policyServerPassthrough: action
      }
    )

    if (typeof response.data === 'string' && response.data.length === 0) {
      // eslint-disable-next-line no-throw-literal
      throw {
        success: false,
        message: 'Could not read presentation definition'
      }
    }

    return response.data?.message
  } catch (error) {
    if (error.response?.data) {
      throw error.response?.data
    }
    throw error
  }
}
