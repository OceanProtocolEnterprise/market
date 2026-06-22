type WaitableTransaction<TReceipt extends { hash?: string }> = {
  hash?: string
  wait?: () => Promise<TReceipt | undefined | null>
}

export async function waitForTransactionReceipt<
  TReceipt extends { hash?: string }
>(
  transaction: WaitableTransaction<TReceipt> | undefined | null
): Promise<TReceipt | undefined | null> {
  if (!transaction?.wait) return

  // eslint-disable-next-line testing-library/await-async-utils
  const confirmTransaction = transaction.wait.bind(transaction)
  const timeout = new Promise<never>((_resolve, reject) => {
    globalThis.setTimeout(
      () =>
        reject(
          new Error(
            `Transaction ${
              transaction.hash || ''
            } confirmation timed out. Please refresh and check the transaction status.`
          )
        ),
      180_000
    )
  })

  return await Promise.race([confirmTransaction(), timeout])
}

export async function waitForTransaction(
  transaction: WaitableTransaction<{ hash?: string }> | undefined | null
): Promise<string | undefined> {
  const receipt = await waitForTransactionReceipt(transaction)
  return receipt?.hash || transaction.hash
}
