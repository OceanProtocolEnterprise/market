import { useEffect } from 'react'
import { toast } from 'react-toastify'
import { ssiEnabled } from 'app.config.cjs'
import { getOpaServerUrl } from '@utils/wallet/policyServer'
import { Credential } from 'src/@types/ddo/Credentials'

export function useOpaServerChangeNotification(
  scopeId: string,
  serviceEndpoint: string,
  credentials: Credential | undefined,
  message: string
): void {
  useEffect(() => {
    if (!ssiEnabled) return

    let cancelled = false
    const toastId = `opa-server-changed-${scopeId}`

    async function checkOpaServer() {
      const opaServerUrl = await getOpaServerUrl(serviceEndpoint)
      if (cancelled || !opaServerUrl) return

      const hasChanged = credentials?.allow?.some((credential) => {
        if (credential.type !== 'SSIpolicy') return false
        return credential.values?.some((value) =>
          value.request_credentials?.some((requestedCredential) =>
            requestedCredential.policies?.some((storedPolicy) => {
              try {
                const policy =
                  typeof storedPolicy === 'string'
                    ? JSON.parse(storedPolicy)
                    : storedPolicy
                if (policy?.policy !== 'dynamic') return false
                const args =
                  typeof policy.args === 'string'
                    ? JSON.parse(policy.args)
                    : policy.args
                return (
                  typeof args?.opa_server === 'string' &&
                  args.opa_server !== opaServerUrl
                )
              } catch {
                return false
              }
            })
          )
        )
      })

      if (hasChanged) {
        toast.info(message, { toastId, autoClose: false })
      }
    }

    checkOpaServer()
    return () => {
      cancelled = true
      toast.dismiss(toastId)
    }
  }, [scopeId, serviceEndpoint, credentials, message])
}
