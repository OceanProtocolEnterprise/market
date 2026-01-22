import { ReactElement, useState } from 'react'
import ReactDOM from 'react-dom'
import styles from './EscrowWithdrawModal.module.css'
import { EscrowContract } from '@oceanprotocol/lib'
import { useChainId } from 'wagmi'
import { getOceanConfig } from '@utils/ocean'
import { useProfile } from '@context/Profile'
import { Signer, formatUnits, parseUnits } from 'ethers'
import { useEthersSigner } from '@hooks/useEthersSigner'

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
  const availableDisplay = Number.isFinite(availableAmount)
    ? availableAmount.toFixed(3)
    : '0'
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
  const isWithdrawDisabled =
    isLoading || trimmedAmount === '' || Number(trimmedAmount) <= 0

  function handleInputChange(e) {
    const val = e.target.value
    setAmount(val)
    setError('')
  }

  function handleMaxClick() {
    setAmount(selectedEscrowFunds.available || '0')
    setError('')
  }

  async function handleWithdraw() {
    if (!trimmedAmount || Number(trimmedAmount) <= 0) {
      setError('Please enter a valid withdrawal amount.')
      return
    }
    let amountUnits: bigint
    try {
      amountUnits = parseUnits(trimmedAmount, selectedEscrowFunds.decimals)
    } catch {
      setError('Please enter a valid withdrawal amount.')
      return
    }
    if (amountUnits <= BigInt(0)) {
      setError('Please enter a valid withdrawal amount.')
      return
    }
    if (amountUnits > availableUnits) {
      setError('Amount can’t be greater than your escrow funds.')
      return
    }
    if (!walletClient || !chainId) {
      setError('Wallet or network not detected.')
      return
    }
    setError('')
    setIsLoading(true)
    const signer = walletClient as unknown as Signer
    try {
      const { escrowAddress } = getOceanConfig(chainId)
      const escrow = new EscrowContract(escrowAddress, signer, chainId)

      const escrowAmount = formatUnits(amountUnits, 18)
      await escrow.withdraw([selectedEscrowFunds.address], [escrowAmount])
      if (refreshEscrowFunds) await refreshEscrowFunds()
      onClose()
    } catch (err) {
      setError(err.message || 'Withdrawal failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const modalContent = (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalBox}>
        <h3 className={styles.modalTitle}>Withdraw Escrow Funds</h3>
        {availableTokens.length > 1 && (
          <div style={{ marginBottom: '10px' }}>
            <label
              style={{
                fontSize: '14px',
                marginBottom: '5px',
                display: 'block'
              }}
            >
              Token:
            </label>
            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              className={styles.tokenSelect}
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
        <div style={{ marginBottom: '10px', fontSize: '14px' }}>
          Available:{' '}
          <strong>
            {availableDisplay} {selectedEscrowFunds.symbol}
          </strong>
        </div>
        <div className={styles.inputRow}>
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={handleInputChange}
            className={styles.input}
            disabled={isLoading}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className={`${styles.button} ${styles.maxButton}`}
            onClick={handleMaxClick}
            disabled={isLoading}
          >
            Max
          </button>
        </div>
        {error && (
          <div style={{ color: 'red', fontSize: '13px', marginBottom: 8 }}>
            {error}
          </div>
        )}
        <button
          onClick={handleWithdraw}
          className={styles.button}
          disabled={isWithdrawDisabled}
        >
          {isLoading ? 'Withdrawing...' : 'Withdraw'}
        </button>
        <button
          onClick={onClose}
          className={styles.closeButton}
          disabled={isLoading}
        >
          Close
        </button>
      </div>
    </div>
  )

  return typeof window !== 'undefined'
    ? ReactDOM.createPortal(modalContent, document.body)
    : null
}
