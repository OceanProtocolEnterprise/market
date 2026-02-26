import {
  checkVerifierSessionId,
  extractFailedPolicyDetails
} from '@utils/wallet/policyServer'
import type { FailedPolicyDetail } from '@utils/wallet/policyServer'

const SSI_VALIDATION_FAILURE_PREFIX = 'Credential check failed'

function humanizeIdentifier(value: string): string {
  const stripped = value.replace(/^gx:/i, '')
  const words = stripped
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  return words
    .map((word) =>
      /^[A-Z0-9]+$/.test(word)
        ? word
        : `${word.charAt(0).toUpperCase()}${word.slice(1)}`
    )
    .join(' ')
}

function simplifyReason(
  reason?: string,
  policyName?: string
): string | undefined {
  if (!reason) return undefined
  const escapedPolicyName = policyName
    ? policyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    : '[^.;:]+'
  const policyConditionPattern = new RegExp(
    `^The policy condition was not met for policy ${escapedPolicyName}[.;:]?\\s*`,
    'i'
  )
  return reason.replace(policyConditionPattern, 'Requirement not met. ').trim()
}

function formatExpectation(expectation?: string): string | undefined {
  if (!expectation) return undefined
  const [rawKey, ...rest] = expectation.split('=')
  const value = rest.join('=')
  if (!rawKey || !value) return `Required value: ${expectation}`
  if (/^param\d*$/i.test(rawKey)) return `Required value: ${value}`
  return `Required ${humanizeIdentifier(rawKey)}: ${value}`
}

interface SsiErrorObject {
  status?: number
  httpStatus?: number
  statusText?: string
  message?: string | { error?: string }
  data?: {
    errorMessage?: string
    message?: string | { error?: string }
    httpStatus?: number
    [key: string]: unknown
  }
  response?: {
    status?: number
    data?: {
      message?: string | { error?: string }
      httpStatus?: number
      [key: string]: unknown
    }
  }
}

function getSsiErrorObject(error: unknown): SsiErrorObject | undefined {
  if (typeof error !== 'object' || error === null) return undefined
  return error as SsiErrorObject
}

function getErrorStatus(error: unknown): number | undefined {
  const errorObject = getSsiErrorObject(error)
  return (
    errorObject?.status ??
    errorObject?.httpStatus ??
    errorObject?.response?.status ??
    errorObject?.data?.httpStatus
  )
}

function isHttpClientError(error: unknown): boolean {
  const status = getErrorStatus(error)
  return typeof status === 'number' && status >= 400 && status < 500
}

function formatFailedPolicies(failedPolicies: FailedPolicyDetail[]): string {
  const uniqueFailedPolicies = failedPolicies.filter((policy, index, all) => {
    const key = [
      policy.credential,
      policy.policyName || policy.policy,
      policy.reason || policy.description || '',
      policy.expectation || ''
    ].join('|')

    return (
      all.findIndex((entry) => {
        const entryKey = [
          entry.credential,
          entry.policyName || entry.policy,
          entry.reason || entry.description || '',
          entry.expectation || ''
        ].join('|')
        return entryKey === key
      }) === index
    )
  })

  return uniqueFailedPolicies
    .map(
      ({
        credential,
        policy,
        policyName,
        reason,
        description,
        expectation
      }) => {
        const credentialLabel = humanizeIdentifier(credential)
        const policyLabel =
          typeof policyName === 'string' && policyName.length > 0
            ? humanizeIdentifier(policyName)
            : humanizeIdentifier(policy)
        const reasonText = simplifyReason(reason, policyName) || description
        const expectationText = formatExpectation(expectation)
        const context = [reasonText, expectationText].filter(Boolean).join(' ')
        return context
          ? `- ${credentialLabel}: ${policyLabel}. ${context}`
          : `- ${credentialLabel}: ${policyLabel}.`
      }
    )
    .join('\n')
}

export function buildSsiValidationErrorMessage(details: string): string {
  const normalizedDetails = details.trim()
  if (normalizedDetails.startsWith('- ')) {
    return `${SSI_VALIDATION_FAILURE_PREFIX}:\n\n${normalizedDetails}`
  }
  return `${SSI_VALIDATION_FAILURE_PREFIX}: ${normalizedDetails}`
}

export function extractSsiErrorDetails(error: unknown): string {
  const errorObject = getSsiErrorObject(error)
  if (typeof errorObject?.message === 'string') return errorObject.message
  if (
    typeof errorObject?.message === 'object' &&
    typeof errorObject.message?.error === 'string'
  ) {
    return errorObject.message.error
  }

  if (typeof errorObject?.data?.errorMessage === 'string')
    return errorObject.data.errorMessage
  if (
    typeof errorObject?.data?.message === 'object' &&
    typeof errorObject.data.message?.error === 'string'
  ) {
    return errorObject.data.message.error
  }
  if (typeof errorObject?.data?.message === 'string')
    return errorObject.data.message

  const status = getErrorStatus(error)
  if (typeof status === 'number' && typeof errorObject?.statusText === 'string')
    return `HTTP ${status}: ${errorObject.statusText}`
  if (typeof status === 'number') return `HTTP ${status}`
  return 'Unknown error'
}

export async function getSsiVerificationFailureDetails(
  error: unknown,
  sessionId: string | undefined,
  logger?: (message: string, err: unknown) => void
): Promise<string> {
  const failedPoliciesInInitialError = extractFailedPolicyDetails(error)
  if (failedPoliciesInInitialError.length > 0)
    return formatFailedPolicies(failedPoliciesInInitialError)

  if (!sessionId || !isHttpClientError(error))
    return extractSsiErrorDetails(error)

  try {
    const checkSessionResult = await checkVerifierSessionId(sessionId)
    const failedPolicies = extractFailedPolicyDetails(checkSessionResult)

    if (failedPolicies.length > 0) return formatFailedPolicies(failedPolicies)
  } catch (checkSessionError) {
    logger?.(
      '[SSI] Failed to fetch policy details after presentation failure',
      checkSessionError
    )

    const failedPoliciesInCheckSessionError =
      extractFailedPolicyDetails(checkSessionError)
    if (failedPoliciesInCheckSessionError.length > 0)
      return formatFailedPolicies(failedPoliciesInCheckSessionError)
  }

  return extractSsiErrorDetails(error)
}
