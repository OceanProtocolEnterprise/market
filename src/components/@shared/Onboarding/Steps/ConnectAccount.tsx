import { FormEvent, ReactElement, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { OnboardingStep } from '..'
import { getErrorMessage } from '@utils/onboarding'
import StepBody from '../StepBody'
import StepHeader from '../StepHeader'
import { useAccount, useChainId, usePublicClient } from 'wagmi'
import content from '../../../../../content/onboarding/steps/connectAccount.json'
import { useModal } from 'connectkit'

export default function ConnectAccount(): ReactElement {
  const {
    title,
    subtitle,
    body,
    image,
    buttonLabel,
    buttonSuccess
  }: OnboardingStep = content
  const { address: accountId } = useAccount()
  const web3Provider = usePublicClient()
  const chainId = useChainId()
  const { setOpen } = useModal()

  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(false)
  const isSSIEnabled = process.env.NEXT_PUBLIC_SSI_ENABLED === 'true'

  const computedSubtitle = isSSIEnabled
    ? 'Now that you created an account with MetaMask, you are ready to connect to the Portal with both web3 and SSI wallets.'
    : 'Now that you created an account with MetaMask, you are ready to connect to the portal.'

  const shortenAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`

  useEffect(() => {
    if (accountId) {
      setCompleted(true)
    } else {
      setCompleted(false)
    }
  }, [accountId])

  const connectAccount = async (e: FormEvent<HTMLButtonElement>) => {
    e.preventDefault()

    try {
      setLoading(true)
      setOpen(true)
    } catch (error) {
      toast.error(
        getErrorMessage({
          accountId,
          web3Provider: !!web3Provider,
          networkId: chainId
        })
      )
      console.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const actions = [
    {
      buttonLabel,
      buttonAction: async (e) => await connectAccount(e),
      successMessage: buttonSuccess,
      loading,
      completed
    }
  ]

  return (
    <div>
      <StepHeader title={title} subtitle={computedSubtitle} />
      <StepBody body={body} image={image} actions={actions}>
        {completed && accountId && (
          <div
            style={{
              marginTop: '12px',
              display: 'inline-block',
              padding: '6px 10px',
              backgroundColor: '#e7f0f7ff',
              color: '#04842dff',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            <strong>Connected wallet:</strong> {shortenAddress(accountId)}
          </div>
        )}
      </StepBody>
    </div>
  )
}
