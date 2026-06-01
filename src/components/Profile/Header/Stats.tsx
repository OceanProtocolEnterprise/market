import { ReactElement, useState } from 'react'
import NumberUnit from './NumberUnit'
import styles from './Stats.module.css'
import { useProfile } from '@context/Profile'
import EscrowWithdrawModal from './EscrowWithdrawModal'
import { formatToFixedNoRounding } from '@utils/numbers'

function TokenAmount({
  amount,
  token
}: {
  amount: string
  token: string
}): ReactElement {
  const value = `${amount} ${token}`

  return (
    <span className={styles.tokenAmount} title={value}>
      <span>{amount}</span>
      <span className={styles.tokenSymbol}>{token}</span>
    </span>
  )
}

function EscrowAvailableLabel({
  hasAvailable
}: {
  hasAvailable: boolean
}): ReactElement {
  return (
    <>
      <span>Escrow Available Funds</span>
      {hasAvailable && (
        <span className={styles.withdrawHint}>👉 Click to Withdraw 👈</span>
      )}
    </>
  )
}

export default function Stats({
  selectedToken
}: {
  selectedToken?: string
}): ReactElement {
  const {
    assetsTotal,
    sales,
    downloadsTotal,
    revenue,
    escrowFundsByToken,
    ownAccount
  } = useProfile()
  const [showModal, setShowModal] = useState(false)

  const activeToken =
    selectedToken ||
    Object.keys(revenue || {})[0] ||
    Object.keys(escrowFundsByToken || {})[0] ||
    ''
  const selectedRevenue = revenue?.[activeToken] || 0
  const selectedEscrow = escrowFundsByToken?.[activeToken] || null
  const selectedEscrowAvailable = selectedEscrow?.available || '0'
  const selectedEscrowLocked = selectedEscrow?.locked || '0'
  const hasAvailable = Number(selectedEscrowAvailable) > 0

  return (
    <div className={styles.stats}>
      <NumberUnit
        label={`Sale${sales === 1 ? '' : 's'}`}
        value={sales < 0 ? 0 : sales}
      />
      <NumberUnit label="Published" value={assetsTotal} />
      <NumberUnit label="Downloads" value={downloadsTotal} />
      {activeToken && (
        <NumberUnit
          label="Revenue"
          value={
            <TokenAmount
              amount={formatToFixedNoRounding(selectedRevenue, 3)}
              token={activeToken}
            />
          }
        />
      )}
      {ownAccount && activeToken && (
        <>
          <NumberUnit
            label="Escrow Locked Funds"
            value={
              <TokenAmount
                amount={formatToFixedNoRounding(selectedEscrowLocked, 3)}
                token={activeToken}
              />
            }
          />
          <div
            onClick={hasAvailable ? () => setShowModal(true) : undefined}
            style={{ cursor: hasAvailable ? 'pointer' : 'default' }}
          >
            <NumberUnit
              label={<EscrowAvailableLabel hasAvailable={hasAvailable} />}
              value={
                <TokenAmount
                  amount={formatToFixedNoRounding(selectedEscrowAvailable, 3)}
                  token={activeToken}
                />
              }
            />
          </div>
        </>
      )}

      {showModal && selectedEscrow && (
        <EscrowWithdrawModal
          escrowFunds={selectedEscrow}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
