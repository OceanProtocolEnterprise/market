import { ReactElement, useState } from 'react'
import Decimal from 'decimal.js'
import NumberUnit from './NumberUnit'
import styles from './Stats.module.css'
import { useProfile } from '@context/Profile'
import EscrowWithdrawModal from './EscrowWithdrawModal'

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
          value={`${selectedRevenue} ${activeToken}`}
        />
      )}
      {ownAccount && activeToken && (
        <>
          <NumberUnit
            label="Escrow Locked Funds"
            value={`${parseInt(selectedEscrowLocked, 10)} ${activeToken}`}
          />
          <div
            onClick={hasAvailable ? () => setShowModal(true) : undefined}
            style={{ cursor: hasAvailable ? 'pointer' : 'default' }}
          >
            <NumberUnit
              label={
                hasAvailable
                  ? 'Escrow Available Funds 👉 Click to Withdraw 👈'
                  : 'Escrow Available Funds'
              }
              value={`${new Decimal(selectedEscrowAvailable || 0)
                .toDecimalPlaces(2, Decimal.ROUND_DOWN)
                .toFixed(2)} ${activeToken}`}
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
