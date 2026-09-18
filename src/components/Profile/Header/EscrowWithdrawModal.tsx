import { ReactElement, useState } from 'react'
import styles from './EscrowWithdrawModal.module.css'
import { EscrowContract } from '@oceanprotocol/lib'
import { useChainId } from 'wagmi'
import { getOceanConfig } from '@utils/ocean'
import { useProfile } from '@context/Profile'
import { Signer, formatUnits, parseUnits } from 'ethers'
import { useEthersSigner } from '@hooks/useEthersSigner'
import Modal from '@shared/atoms/Modal'
import Button from '@shared/atoms/Button'

interface EscrowFunds {
  available: string
  locked: string
  symbol: string
  address: string
  decimals: number
}

function getValidationError(value: string, funds: EscrowFunds): string {
  try {
    const amount = parseUnits(value.trim(), funds.decimals)
    if (amount <= 0n)
      return 'Please enter a withdrawal amount greater than zero.'
    if (amount > parseUnits(funds.available, funds.decimals)) {
      return 'Amount can’t be greater than your available escrow funds.'
    }
    return ''
  } catch {
    return `Enter a valid amount with at most ${funds.decimals} decimals.`
  }
}

export default function EscrowWithdrawModal({
  escrowFunds,
  onClose
}: {
  escrowFunds: EscrowFunds
  onClose: () => void
}): ReactElement {
  const { refreshEscrowFunds, escrowFundsByToken } = useProfile()
  const walletClient = useEthersSigner()
  const chainId = useChainId()
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [selectedTokens, setSelectedTokens] = useState<string[]>([
    escrowFunds.address.toLowerCase()
  ])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const tokens = Object.values(escrowFundsByToken || {})
  const availableTokens = tokens.length ? tokens : [escrowFunds]
  const selectedFunds = availableTokens.filter((funds) =>
    selectedTokens.includes(funds.address.toLowerCase())
  )
  const isWithdrawDisabled =
    isLoading ||
    selectedFunds.length === 0 ||
    selectedFunds.some((funds) =>
      Boolean(
        getValidationError(amounts[funds.address.toLowerCase()] || '', funds)
      )
    )

  function setAmount(address: string, value: string) {
    setAmounts((previous) => ({ ...previous, [address]: value }))
    setError('')
  }

  async function handleWithdraw() {
    if (isWithdrawDisabled) return
    if (!walletClient || !chainId) {
      setError('Wallet or network not detected.')
      return
    }
    setError('')
    setIsLoading(true)
    try {
      const escrowAddress = getOceanConfig(chainId)?.escrowAddress
      if (!escrowAddress)
        throw new Error('Escrow is not configured for this network.')
      const signer = walletClient as unknown as Signer
      const escrow = new EscrowContract(escrowAddress, signer, chainId)
      const owner = await signer.getAddress()
      const withdrawalAmounts = selectedFunds.map((funds) =>
        parseUnits(amounts[funds.address.toLowerCase()].trim(), funds.decimals)
      )
      // Recheck available funds: running jobs may have locked funds since the modal opened.
      const balances = await Promise.all(
        selectedFunds.map((funds) => escrow.getUserFunds(owner, funds.address))
      )
      selectedFunds.forEach((funds, index) => {
        if (
          withdrawalAmounts[index] >
          BigInt(balances[index].available.toString())
        ) {
          throw new Error(
            `Available ${funds.symbol} balance changed. Refresh your funds and try again.`
          )
        }
      })
      const transaction = await escrow.withdraw(
        selectedFunds.map((funds) => funds.address),
        selectedFunds.map((funds, index) =>
          formatUnits(withdrawalAmounts[index], funds.decimals)
        )
      )
      if (!transaction) {
        throw new Error('Withdrawal was not confirmed. Please try again.')
      }
      const receipt = await transaction.wait()
      if (receipt?.status !== 1)
        throw new Error('Withdrawal was not confirmed. Please try again.')
      // The contract can skip an insufficient balance without reverting the batch.
      const withdrawn = new Map<string, bigint>()
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== escrowAddress.toLowerCase()) continue
        const event = escrow.contract.interface.parseLog(log)
        if (
          event?.name === 'Withdraw' &&
          event.args.payer.toLowerCase() === owner.toLowerCase()
        ) {
          const token = event.args.token.toLowerCase()
          withdrawn.set(token, (withdrawn.get(token) || 0n) + event.args.amount)
        }
      }
      // Clear submitted amounts before refreshing, so a partial result cannot be retried twice.
      setAmounts({})
      if (refreshEscrowFunds) await refreshEscrowFunds()
      if (
        selectedFunds.some(
          (funds, index) =>
            withdrawn.get(funds.address.toLowerCase()) !==
            withdrawalAmounts[index]
        )
      ) {
        throw new Error(
          'Not all withdrawals completed. Review the refreshed balances and enter the remaining amounts.'
        )
      }
      onClose()
    } catch (err) {
      setError(err.message || 'Withdrawal failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal
      title="Withdraw Escrow Funds"
      isOpen
      onToggleModal={() => !isLoading && onClose()}
      shouldCloseOnOverlayClick={!isLoading}
      shouldCloseOnEsc={!isLoading}
    >
      <div className={styles.content}>
        {availableTokens.length > 1 && (
          <p className={styles.hint}>
            Select tokens to withdraw in one transaction. Locked funds cannot be
            withdrawn.
          </p>
        )}
        {availableTokens.map((funds) => {
          const address = funds.address.toLowerCase()
          const selected = selectedTokens.includes(address)
          const amount = amounts[address] || ''
          const validationError =
            selected && amount ? getValidationError(amount, funds) : ''
          return (
            <div key={address} className={styles.tokenGroup}>
              <div className={styles.availableRow}>
                <label className={styles.tokenLabel}>
                  {availableTokens.length > 1 && (
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={isLoading}
                      onChange={(event) => {
                        setSelectedTokens((previous) =>
                          event.target.checked
                            ? [...previous, address]
                            : previous.filter((token) => token !== address)
                        )
                        setError('')
                      }}
                    />
                  )}
                  {funds.symbol}
                </label>
                <span className={styles.label}>
                  Available: {funds.available}
                </span>
              </div>
              {selected && (
                <div className={styles.fieldGroup}>
                  <label
                    className={styles.label}
                    htmlFor={`escrow-amount-${address}`}
                  >
                    Amount ({funds.symbol})
                  </label>
                  <div className={styles.inputRow}>
                    <input
                      id={`escrow-amount-${address}`}
                      type="text"
                      placeholder="0.0"
                      value={amount}
                      onChange={(event) =>
                        setAmount(address, event.target.value)
                      }
                      disabled={isLoading}
                      className={styles.input}
                      inputMode="decimal"
                      aria-invalid={Boolean(validationError)}
                      aria-describedby={
                        validationError ? `escrow-error-${address}` : undefined
                      }
                    />
                    <Button
                      type="button"
                      style="outlined"
                      size="small"
                      onClick={() => setAmount(address, funds.available)}
                      disabled={isLoading}
                      className={styles.maxButton}
                    >
                      Max
                    </Button>
                  </div>
                  {validationError && (
                    <div
                      id={`escrow-error-${address}`}
                      className={styles.error}
                    >
                      {validationError}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {error && (
          <div role="alert" className={styles.error}>
            {error}
          </div>
        )}
        <div className={styles.actions}>
          <Button
            style="ghost"
            type="button"
            onClick={onClose}
            disabled={isLoading}
          >
            Close
          </Button>
          <Button
            style="primary"
            type="button"
            onClick={handleWithdraw}
            disabled={isWithdrawDisabled}
          >
            {isLoading ? 'Withdrawing...' : 'Withdraw'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
