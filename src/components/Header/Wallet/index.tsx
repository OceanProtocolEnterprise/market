import { ReactElement, useEffect, useRef, useState } from 'react'
import Account from './Account'
import Details from './Details'
import Tooltip from '@shared/atoms/Tooltip'
import styles from './index.module.css'
import { useAccount } from 'wagmi'
import Network from './Network'
import { useDfnsConnect } from '@hooks/useDfnsConnect'
import { useAuth } from '@hooks/useAuth'
import { useSignerServerConnect } from '@hooks/useSignerServerConnect'
import { useMetaMaskConnect } from '@hooks/useMetaMaskConnect'
import WalletChoiceModal from '@shared/WalletChoiceModal'
import DfnsRegistrationModal from '@shared/DfnsRegistrationModal'
import { getRuntimeConfig } from '@utils/runtimeConfig'

type TooltipHandle = {
  hide?: () => void
}

export default function Wallet(): ReactElement {
  const { address: accountId } = useAccount()
  const metaMask = useMetaMaskConnect()
  const dfns = useDfnsConnect()
  const signerServer = useSignerServerConnect()
  const { authEnabled } = useAuth()
  const isDfnsEnabled = getRuntimeConfig().NEXT_PUBLIC_DFNS_ENABLED === 'true'
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
        isSignerServerConnecting={signerServer.isConnecting}
        showDfns={authEnabled && isDfnsEnabled}
        showSignerServer={signerServer.isConfigured}
        onClose={() => setIsWalletChoiceOpen(false)}
        onSelectMetaMask={() => {
          setIsWalletChoiceOpen(false)
          metaMask.openConnect()
        }}
        onSelectDfns={() => {
          setIsWalletChoiceOpen(false)
          dfns.openConnect()
        }}
        onSelectSignerServer={() => {
          setIsWalletChoiceOpen(false)
          signerServer.openConnect()
        }}
      />

      {isDfnsEnabled && (
        <DfnsRegistrationModal
          isOpen={dfns.isRegistrationModalOpen}
          registrationCode={dfns.registrationCode}
          isConnecting={dfns.isConnecting}
          onChange={dfns.setRegistrationCode}
          onSubmit={dfns.submitRegistrationCode}
          onClose={() => dfns.setIsRegistrationModalOpen(false)}
        />
      )}
    </div>
  )
}
