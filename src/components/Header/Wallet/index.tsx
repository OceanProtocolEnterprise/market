import { ReactElement, useEffect, useRef, useState } from 'react'
import Account from './Account'
import Details from './Details'
import Tooltip from '@shared/atoms/Tooltip'
import styles from './index.module.css'
import { useAccount } from 'wagmi'
import { useModal } from 'connectkit'
import Network from './Network'
import { useDfnsConnect } from '@hooks/useDfnsConnect'
import { useAuth } from '@hooks/useAuth'
import WalletChoiceModal from '@shared/WalletChoiceModal'
import DfnsRegistrationModal from '@shared/DfnsRegistrationModal'

type TooltipHandle = {
  hide?: () => void
}

export default function Wallet(): ReactElement {
  const { address: accountId } = useAccount()
  const { setOpen } = useModal()
  const dfns = useDfnsConnect()
  const { authEnabled } = useAuth()
  const [isSsiModalOpen, setIsSsiModalOpen] = useState(false)
  const [isWalletChoiceOpen, setIsWalletChoiceOpen] = useState(false)
  const tooltipRef = useRef<TooltipHandle | null>(null)

  useEffect(() => {
    if (isSsiModalOpen) {
      tooltipRef.current?.hide?.()
    }
  }, [isSsiModalOpen])

  return (
    <div className={styles.wallet}>
      {accountId && <Network />}
      <Tooltip
        content={
          <Details
            onRequestClose={() => tooltipRef.current?.hide?.()}
            onRequestWalletChoice={() => setIsWalletChoiceOpen(true)}
          />
        }
        trigger="click focus mouseenter"
        disabled={isSsiModalOpen || isWalletChoiceOpen}
        onCreate={(instance) => {
          tooltipRef.current = instance
        }}
      >
        <Account onSsiModalOpenChange={setIsSsiModalOpen} />
      </Tooltip>
      <WalletChoiceModal
        isOpen={isWalletChoiceOpen}
        isDfnsConnecting={dfns.isConnecting}
        showDfns={authEnabled}
        onClose={() => setIsWalletChoiceOpen(false)}
        onSelectMetaMask={() => {
          setIsWalletChoiceOpen(false)
          setOpen(true)
        }}
        onSelectDfns={() => {
          setIsWalletChoiceOpen(false)
          dfns.openConnect()
        }}
      />

      <DfnsRegistrationModal
        isOpen={dfns.isRegistrationModalOpen}
        registrationCode={dfns.registrationCode}
        isConnecting={dfns.isConnecting}
        onChange={dfns.setRegistrationCode}
        onSubmit={dfns.submitRegistrationCode}
        onClose={() => dfns.setIsRegistrationModalOpen(false)}
      />
    </div>
  )
}
