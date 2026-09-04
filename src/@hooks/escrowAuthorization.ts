export function getFirstEscrowAuthorization<T>(
  authorizations: ArrayLike<T>
): T | undefined {
  return authorizations.length > 0 ? authorizations[0] : undefined
}
