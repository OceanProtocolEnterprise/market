type WaitableTransaction<TReceipt extends { hash?: string }> = {
  hash?: string
  wait?: () => Promise<TReceipt | undefined | null>
}

export async function waitForTransactionReceipt<
  TReceipt extends { hash?: string }
>(
  transaction: WaitableTransaction<TReceipt> | undefined | null
): Promise<TReceipt | undefined | null> {
  const hash = transaction?.hash
  const startedAt = Date.now()

  if (!transaction?.wait) {
    console.warn('[tx.wait] skipped: transaction has no wait()', { hash })
    return
  }

  console.log('[tx.wait] start', { hash })

  // eslint-disable-next-line testing-library/await-async-utils
  const confirmTransaction = transaction.wait.bind(transaction)
  const timeout = new Promise<never>((_resolve, reject) => {
    globalThis.setTimeout(() => {
      console.error('[tx.wait] timeout', {
        hash,
        elapsedMs: Date.now() - startedAt
      })
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
    const receipt = await Promise.race([confirmTransaction(), timeout])
    console.log('[tx.wait] confirmed', {
      hash: receipt?.hash || hash,
      elapsedMs: Date.now() - startedAt
    })
    return receipt
  } catch (error) {
    console.error('[tx.wait] failed', {
      hash,
      elapsedMs: Date.now() - startedAt,
      error
    })
    throw error
  }
}

export async function waitForTransaction(
  transaction: WaitableTransaction<{ hash?: string }> | undefined | null
): Promise<string | undefined> {
  const receipt = await waitForTransactionReceipt(transaction)
  const hash = receipt?.hash || transaction?.hash
  console.log('[tx.wait] result hash', { hash })
  return hash
}
