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
import { formatToFixed } from '@utils/numbers'

const ESCROW_WITHDRAW_TEXT = {
  invalidAmount: 'Please enter a valid withdrawal amount.',
  exceedsBalance: 'Amount can’t be greater than your escrow funds.',
  walletMissing: 'Wallet or network not detected.',
  withdrawFailed: 'Withdrawal failed. Please try again.'
} as const

interface EscrowFunds {
  available: string
  locked: string
  symbol: string
  address: string
  decimals: number
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
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedToken, setSelectedToken] = useState(escrowFunds.symbol)
  const trimmedAmount = amount.trim()

  const availableTokens = Object.keys(escrowFundsByToken || {})
  const selectedEscrowFunds = escrowFundsByToken?.[selectedToken] || escrowFunds
  const availableAmount = Number(selectedEscrowFunds.available)
  const availableDisplay = formatToFixed(availableAmount, 3)
  const availableUnits = (() => {
    try {
      return parseUnits(
        selectedEscrowFunds.available || '0',
        selectedEscrowFunds.decimals
      )
    } catch {
      return BigInt(0)
    }
  })()

  function getValidationError(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return ''
    if (Number(trimmed) <= 0) return ESCROW_WITHDRAW_TEXT.invalidAmount

    try {
      const amountUnits = parseUnits(trimmed, selectedEscrowFunds.decimals)
      if (amountUnits > availableUnits) {
        return ESCROW_WITHDRAW_TEXT.exceedsBalance
      }
    } catch (err) {
      if (err?.message?.toLowerCase?.().includes('too many decimals')) {
        return `Too many decimals (max ${selectedEscrowFunds.decimals}).`
      }
      return ESCROW_WITHDRAW_TEXT.invalidAmount
    }

    return ''
  }

  function handleInputChange(e) {
    const val = e.target.value
    setAmount(val)
    setError(getValidationError(val))
  }

  const validationError = getValidationError(trimmedAmount)
  const isWithdrawDisabled =
    isLoading ||
    trimmedAmount === '' ||
    Number(trimmedAmount) <= 0 ||
    !!validationError

  function handleTokenChange(e) {
    setSelectedToken(e.target.value)
    setAmount('')
    setError('')
  }

  function handleMaxClick() {
    setAmount(selectedEscrowFunds.available || '0')
    setError('')
  }

  async function handleWithdraw() {
    if (!trimmedAmount || Number(trimmedAmount) <= 0) {
      setError(ESCROW_WITHDRAW_TEXT.invalidAmount)
      return
    }
    let amountUnits: bigint
    try {
      amountUnits = parseUnits(trimmedAmount, selectedEscrowFunds.decimals)
    } catch {
      setError(ESCROW_WITHDRAW_TEXT.invalidAmount)
      return
    }
    if (amountUnits <= BigInt(0)) {
      setError(ESCROW_WITHDRAW_TEXT.invalidAmount)
      return
    }
    if (amountUnits > availableUnits) {
      setError(ESCROW_WITHDRAW_TEXT.exceedsBalance)
      return
    }
    if (!walletClient || !chainId) {
      setError(ESCROW_WITHDRAW_TEXT.walletMissing)
      return
    }
    setError('')
    setIsLoading(true)
    const signer = walletClient as unknown as Signer
    try {
      const { escrowAddress } = getOceanConfig(chainId)
      const escrow = new EscrowContract(escrowAddress, signer, chainId)

      const escrowAmount = formatUnits(
        amountUnits,
        selectedEscrowFunds.decimals
      )
      await escrow.withdraw([selectedEscrowFunds.address], [escrowAmount])
      if (refreshEscrowFunds) await refreshEscrowFunds()
      onClose()
    } catch (err) {
      setError(err.message || ESCROW_WITHDRAW_TEXT.withdrawFailed)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal
      title="Withdraw Escrow Funds"
      isOpen
      onToggleModal={onClose}
      shouldCloseOnOverlayClick={!isLoading}
    >
      <div className={styles.content}>
        {availableTokens.length > 1 && (
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="escrow-token">
              Token
            </label>
            <select
              id="escrow-token"
              value={selectedToken}
              onChange={handleTokenChange}
              className={styles.select}
              disabled={isLoading}
            >
              {availableTokens.map((token) => (
                <option key={token} value={token}>
                  {token}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.availableRow}>
          <span className={styles.label}>Available</span>
          <span className={styles.value}>
            {availableDisplay} {selectedEscrowFunds.symbol}
          </span>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="escrow-amount">
            Amount
          </label>
          <div className={styles.inputRow}>
            <input
              id="escrow-amount"
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={handleInputChange}
              disabled={isLoading}
              className={styles.input}
              min="0"
              inputMode="decimal"
            />
            <Button
              type="button"
              style="outlined"
              size="small"
              onClick={handleMaxClick}
              disabled={isLoading}
              className={styles.maxButton}
            >
              Max
            </Button>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

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
