import { ReactElement, useEffect, useRef, useState } from 'react'
import Account from './Account'
import Details from './Details'
import Tooltip from '@shared/atoms/Tooltip'
import styles from './index.module.css'
import { useAccount } from 'wagmi'
import Network from './Network'

export default function Wallet(): ReactElement {
  const { address: accountId } = useAccount()
  const [isSsiModalOpen, setIsSsiModalOpen] = useState(false)
  const tooltipRef = useRef<any>(null)

  useEffect(() => {
    if (isSsiModalOpen) {
      tooltipRef.current?.hide?.()
    }
  }, [isSsiModalOpen])

  return (
    <div className={styles.wallet}>
      <Network />
      <Tooltip
        content={<Details />}
        trigger="click focus mouseenter"
        disabled={!accountId || isSsiModalOpen}
        onCreate={(instance) => {
          tooltipRef.current = instance
        }}
      >
        <Account onSsiModalOpenChange={setIsSsiModalOpen} />
      </Tooltip>
    </div>
  )
}
