const VERIFIER_SESSION_ID_STORAGE_KEY = 'verifierSessionId'

export const VERIFIER_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000

interface StoredVerifierSession {
  sessionId: string
  expiresAt: number
}

function isValidStoredSession(entry: unknown): entry is StoredVerifierSession {
  return (
    !!entry &&
    typeof entry === 'object' &&
    typeof (entry as StoredVerifierSession).sessionId === 'string' &&
    typeof (entry as StoredVerifierSession).expiresAt === 'number' &&
    (entry as StoredVerifierSession).expiresAt > Date.now()
  )
}

function persistSessions(sessions: Record<string, StoredVerifierSession>) {
  if (Object.keys(sessions).length === 0) {
    window.localStorage.removeItem(VERIFIER_SESSION_ID_STORAGE_KEY)
    return
  }
  window.localStorage.setItem(
    VERIFIER_SESSION_ID_STORAGE_KEY,
    JSON.stringify(sessions)
  )
}

function readStoredSessions(): Record<string, StoredVerifierSession> {
  if (typeof window === 'undefined') return {}

  let parsed: unknown
  try {
    const storage = window.localStorage.getItem(VERIFIER_SESSION_ID_STORAGE_KEY)
    parsed = storage ? JSON.parse(storage) : {}
  } catch {
    parsed = {}
  }

  const sessions: Record<string, StoredVerifierSession> = {}
  if (parsed && typeof parsed === 'object') {
    for (const [key, entry] of Object.entries(parsed)) {
      if (isValidStoredSession(entry)) sessions[key] = entry
    }
  }

  return sessions
}

export function readVerifierSessions(): Record<string, string> {
  if (typeof window === 'undefined') return {}

  const sessions = readStoredSessions()
  try {
    persistSessions(sessions)
  } catch {}

  const result: Record<string, string> = {}
  for (const [key, entry] of Object.entries(sessions)) {
    result[key] = entry.sessionId
  }
  return result
}

export function storeVerifierSession(
  key: string,
  sessionId: string
): Record<string, string> {
  if (typeof window === 'undefined') return {}

  const sessions = readStoredSessions()
  sessions[key] = {
    sessionId,
    expiresAt: Date.now() + VERIFIER_SESSION_MAX_AGE_MS
  }

  try {
    persistSessions(sessions)
  } catch {}

  const result: Record<string, string> = {}
  for (const [entryKey, entry] of Object.entries(sessions)) {
    result[entryKey] = entry.sessionId
  }
  return result
}

export function clearVerifierSessions(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(VERIFIER_SESSION_ID_STORAGE_KEY)
  } catch {}
}

export function getStoredVerifierSessionId(
  did: string,
  serviceId: string
): string {
  const sessions = readVerifierSessions()

  return (
    sessions?.[`${did}_${serviceId}`] ||
    sessions?.[`${did}_${serviceId}_skip`] ||
    ''
  )
}

export function resolveVerifierSessionId(
  did: string,
  serviceId: string,
  sessionId?: string | null
): string {
  return sessionId || getStoredVerifierSessionId(did, serviceId)
}
