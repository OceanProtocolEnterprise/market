/* eslint-disable camelcase */
import Button from '@components/@shared/atoms/Button'
import { useSsiWallet } from '@context/SsiWallet'
import { LoggerInstance } from '@oceanprotocol/lib'
import { requestCredentialPresentation } from '@utils/wallet/policyServer'
import {
  extractURLSearchParams,
  requestPresentationDefinition,
  matchCredentialForPresentationDefinition,
  getWalletDids,
  resolvePresentationRequest,
  usePresentationRequest
} from '@utils/wallet/ssiWallet'
import { useState } from 'react'
import { AssetExtended } from 'src/@types/AssetExtended'

enum CredentialCheckState {
  Init,
  ShowVpDialog,
  ShowDidDialog,
  Stop
}

export function AssetActionCheckCredentials({
  asset
}: {
  asset: AssetExtended
}) {
  const {
    verifierSessionId,
    setVerifierSessionId,
    selectedWallet,
    selectedKey
  } = useSsiWallet()

  const [showVpDialog, setShowVpDialog] = useState<boolean>(false)

  async function handleCheckCredentials() {
    if (verifierSessionId) {
      console.log('yes')
    } else {
      console.log('no')
    }

    try {
      const openid4vp = await requestCredentialPresentation(asset)

      const searchParams = extractURLSearchParams(openid4vp)
      const { presentation_definition_uri, state } = searchParams

      const presentationDefinition = await requestPresentationDefinition(
        presentation_definition_uri
      )

      const verifiableCredentials =
        await matchCredentialForPresentationDefinition(
          selectedWallet?.id,
          presentationDefinition
        )

      setShowVpDialog(true)

      const selectedCredentials = verifiableCredentials.map((credential) => {
        return credential.id
      })

      const dids = await getWalletDids(selectedWallet.id)
      const did = dids.length > 0 ? dids[0].did : ''

      const resolvedPresentationRequest = await resolvePresentationRequest(
        selectedWallet?.id,
        openid4vp
      )

      // eslint-disable-next-line react-hooks/rules-of-hooks
      const result = await usePresentationRequest(
        selectedWallet?.id,
        did,
        resolvedPresentationRequest,
        selectedCredentials
      )

      if (result.success) {
        // setVerifierSessionId(state)
        console.log('success')
      }
    } catch (error) {
      setVerifierSessionId(undefined)
      LoggerInstance.error(error)
    }
  }

  return (
    <div style={{ textAlign: 'left', marginTop: '2%' }}>
      <div style={{ textAlign: 'center' }}>
        <Button
          type="button"
          style="primary"
          onClick={handleCheckCredentials}
          disabled={!selectedWallet?.id}
        >
          Check Credentials
        </Button>
      </div>
    </div>
  )
}
