type WaitableTransaction<TReceipt extends { hash?: string }> = {
  hash?: string
  wait?: () => Promise<TReceipt | undefined | null>
}

function asWaitableTransaction<TReceipt extends { hash?: string }>(
  transaction: unknown
): WaitableTransaction<TReceipt> | undefined {
  if (!transaction || typeof transaction !== 'object') return

  const maybeTransaction = transaction as WaitableTransaction<TReceipt>
  return typeof maybeTransaction.wait === 'function'
    ? maybeTransaction
    : undefined
}

export async function waitForTransactionReceipt<
  TReceipt extends { hash?: string }
>(transaction: unknown): Promise<TReceipt | undefined | null> {
  const waitableTransaction = asWaitableTransaction<TReceipt>(transaction)
  const hash =
    transaction && typeof transaction === 'object'
      ? (transaction as { hash?: string }).hash
      : undefined

  if (!waitableTransaction) return

  // eslint-disable-next-line testing-library/await-async-utils
  const confirmTransaction = () => waitableTransaction.wait?.()
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = globalThis.setTimeout(() => {
      reject(
        new Error(
          `Transaction ${
            hash || ''
          } confirmation timed out. Please refresh and check the transaction status.`
        )
      )
    }, 180_000)
  })

  try {
    return await Promise.race([confirmTransaction(), timeout])
  } finally {
    if (timeoutId) globalThis.clearTimeout(timeoutId)
  }
}

export async function waitForTransaction(
  transaction: unknown
): Promise<string | undefined> {
  const receipt = await waitForTransactionReceipt(transaction)
  return (
    receipt?.hash ||
    (transaction && typeof transaction === 'object'
      ? (transaction as { hash?: string }).hash
      : undefined)
  )
}
