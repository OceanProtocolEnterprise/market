import { ReactElement, useEffect, useState } from 'react'
import { OnboardingStep } from '..'
import StepBody from '../StepBody'
import StepHeader from '../StepHeader'
import content from '../../../../../content/onboarding/steps/downloadMetamask.json'

export default function DownloadMetamask(): ReactElement {
  const { title, subtitle, body, image, buttonLabel }: OnboardingStep = content
  const [isMetaMaskDetected, setIsMetaMaskDetected] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMetaMaskDetected(!!(window as any).ethereum?.isMetaMask)
    }
  }, [])

  const downloadMetamask = () =>
    window.open(
      'https://metamask.io/download/',
      '_blank',
      'noopener noreferrer'
    )

  const actions = isMetaMaskDetected
    ? [
        {
          buttonLabel: '✅ MetaMask is already available in your browser',
          buttonAction: () => {},
          loading: false,
          completed: true
        }
      ]
    : [
        {
          buttonLabel,
          buttonAction: () => downloadMetamask(),
          loading: false,
          completed: false
        }
      ]

  return (
    <div>
      <StepHeader title={title} subtitle={subtitle} />
      <StepBody body={body} image={image} actions={actions} />
    </div>
  )
}
