import { ReactElement, useEffect, useState } from 'react'
import styles from './index.module.css'
import Header from './Header'
import Main from './Main'
import Navigation from './Navigation'
import Container from '../atoms/Container'
import Stepper from './Stepper'
import DownloadMetamask from './Steps/DownloadMetamask'
import ConnectAccount from './Steps/ConnectAccount'
import ImportCustomTokens from './Steps/ImportCustomTokens'
import Ready from './Steps/Ready'
import { useAccount, usePublicClient, useChainId } from 'wagmi'
import { useUserPreferences } from '@context/UserPreferences'
import useBalance from '@hooks/useBalance'
import Faucet from './Steps/Faucet/Faucet'
import SSI from './Steps/SSI/Ssi'
import { getSupportedChainIds } from 'chains.config.cjs'

export interface OnboardingStep {
  title: string
  subtitle: string
  body: string
  image?: string
  buttonLabel?: string
  buttonSuccess?: string
}
const isSSIEnabled = process.env.NEXT_PUBLIC_SSI_ENABLED === 'true'

const steps = [
  { shortLabel: 'MetaMask', component: <DownloadMetamask /> },
  { shortLabel: 'Connect', component: <ConnectAccount /> },
  { shortLabel: 'Tokens', component: <ImportCustomTokens /> },
  { shortLabel: 'Faucet', component: <Faucet /> },

  ...(isSSIEnabled ? [{ shortLabel: 'SSI', component: <SSI /> }] : []),

  { shortLabel: 'Ready', component: <Ready /> }
]

export enum NavigationDirections {
  PREV = 'prev',
  NEXT = 'next'
}

export default function OnboardingSection(): ReactElement {
  const { address: accountId } = useAccount()
  const { balance } = useBalance()
  const web3Provider = usePublicClient()
  const chainId = useChainId()
  const { onboardingStep, setOnboardingStep } = useUserPreferences()
  const [onboardingCompleted, setOnboardingCompleted] = useState(false)
  const [navigationDirection, setNavigationDirection] =
    useState<NavigationDirections>()
  const stepLabels = steps.map((step) => step.shortLabel)

  useEffect(() => {
    if (onboardingStep > steps.length) setOnboardingStep(0)
  }, [onboardingStep, setOnboardingStep])

  useEffect(() => {
    if (accountId && web3Provider && getSupportedChainIds().includes(chainId)) {
      setOnboardingCompleted(true)
    }
  }, [accountId, balance, chainId, web3Provider])

  return (
    <div className={styles.wrapper}>
      <Header />
      <Container className={styles.cardWrapper}>
        <div className={styles.cardContainer}>
          <Stepper
            stepLabels={stepLabels}
            currentStep={onboardingStep}
            onboardingCompleted={onboardingCompleted}
            setCurrentStep={setOnboardingStep}
            setNavigationDirection={setNavigationDirection}
          />
          <Main
            currentStep={onboardingStep}
            navigationDirection={navigationDirection}
            steps={steps}
          />
          <Navigation
            currentStep={onboardingStep}
            onboardingCompleted={onboardingCompleted}
            setCurrentStep={setOnboardingStep}
            setNavigationDirection={setNavigationDirection}
            totalStepsCount={steps.length}
          />
        </div>
      </Container>
    </div>
  )
}
