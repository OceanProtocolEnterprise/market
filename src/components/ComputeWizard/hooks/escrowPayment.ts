import type { EscrowContract } from '@oceanprotocol/lib'
import { Contract, formatUnits } from 'ethers'
import { getFirstEscrowAuthorization } from './escrowAuthorization'

export async function prepareEscrowPayment({
  escrow,
  erc20,
  escrowAddress,
  token,
  owner,
  payee,
  amount,
  minLockSeconds,
  decimals
}: {
  escrow: EscrowContract
  erc20: Contract
  escrowAddress: string
  token: string
  owner: string
  payee: string
  amount: number | string
  minLockSeconds: number | string
  decimals: number
}): Promise<boolean> {
  const requiredAmount = BigInt(amount)
  if (requiredAmount <= 0n) return false

  const [funds, authorizations] = await Promise.all([
    escrow.getUserFunds(owner, token),
    escrow.getAuthorizations(token, owner, payee)
  ])
  const available = BigInt(funds.available.toString())
  const depositAmount =
    requiredAmount > available ? requiredAmount - available : 0n
  const authorization = getFirstEscrowAuthorization(authorizations)
  const currentLockedAmount = BigInt(
    authorization?.currentLockedAmount?.toString() || '0'
  )
  const currentLocks = BigInt(authorization?.currentLocks?.toString() || '0')
  const existingAmount = BigInt(
    authorization?.maxLockedAmount?.toString() || '0'
  )
  const existingSeconds = BigInt(
    authorization?.maxLockSeconds?.toString() || '0'
  )
  const existingCounts = BigInt(authorization?.maxLockCounts?.toString() || '0')
  const requiredLimit = currentLockedAmount + requiredAmount
  const requiredSeconds = BigInt(minLockSeconds)
  const requiredCounts = currentLocks + 1n
  const needsAuthorization =
    existingAmount < requiredLimit ||
    existingSeconds < requiredSeconds ||
    existingCounts < requiredCounts

  if (depositAmount === 0n && !needsAuthorization) return false

  if (depositAmount > 0n) {
    const allowance = BigInt(
      (await erc20.allowance(owner, escrowAddress)).toString()
    )
    if (allowance < depositAmount) {
      const approval = await erc20.approve(escrowAddress, depositAmount)
      if (!approval) {
        throw new Error('Escrow token approval was not confirmed.')
      }
      const receipt = await approval.wait()
      if (receipt?.status !== 1) {
        throw new Error('Escrow token approval was not confirmed.')
      }
    }
  }

  // SDK bundle amounts are human-readable; provider amounts and balances are base units.
  const max = (a: bigint, b: bigint) => (a > b ? a : b)
  const transaction = await escrow.bundle(
    depositAmount > 0n
      ? [{ token, amount: formatUnits(depositAmount, decimals) }]
      : [],
    [],
    needsAuthorization
      ? [
          {
            token,
            payee,
            maxLockedAmount: formatUnits(
              max(existingAmount, requiredLimit),
              decimals
            ),
            maxLockSeconds: max(existingSeconds, requiredSeconds).toString(),
            maxLockCounts: max(
              existingCounts,
              max(10n, requiredCounts)
            ).toString()
          }
        ]
      : [],
    decimals
  )
  if (!transaction) {
    throw new Error('Escrow payment was not confirmed. Please try again.')
  }
  const receipt = await transaction.wait()
  if (receipt?.status !== 1) {
    throw new Error('Escrow payment was not confirmed. Please try again.')
  }
  return true
}
