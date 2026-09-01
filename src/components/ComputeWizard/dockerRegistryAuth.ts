import type { dockerRegistryAuth as DockerRegistryAuth } from '@oceanprotocol/lib'
import type { FormComputeData } from './_types'

const DOCKER_CONTEXT_PATTERN =
  /docker|container|registry|repository|image|manifest/i
const AUTH_OR_ACCESS_FAILURE_PATTERN =
  /\b40[13]\b|unauthori[sz]ed|authentication|credentials?|access denied|pull access denied|forbidden|docker login|denied: requested access/i

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error

  try {
    return JSON.stringify(error) || ''
  } catch {
    return ''
  }
}

export function isDockerRegistryAuthError(error: unknown): boolean {
  const message = getErrorMessage(error)
  return (
    DOCKER_CONTEXT_PATTERN.test(message) &&
    AUTH_OR_ACCESS_FAILURE_PATTERN.test(message)
  )
}

export function getDockerRegistryAuth(
  values: Pick<
    FormComputeData,
    'dockerRegistryUsername' | 'dockerRegistryPassword'
  >
): DockerRegistryAuth | undefined {
  const username = values.dockerRegistryUsername.trim()
  const password = values.dockerRegistryPassword

  if (!username || !password) return undefined

  return { username, password }
}
