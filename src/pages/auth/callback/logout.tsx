import { useEffect } from 'react'
import { useAuthStore } from '@hooks/stores/authStore'
import { useAuth } from '@hooks/useAuth'
import { useRouter } from 'next/router'
import { clearVM3Storage, restoreVM3SessionData } from '@utils/logoutRouter'

export default function LogoutCallback() {
  const router = useRouter()
  const storeLogout = useAuthStore((s) => s.logout)
  const { logout } = useAuth()

  useEffect(() => {
    const flow = sessionStorage.getItem('logout_flow')
    const isTimeout = sessionStorage.getItem('vm3_logout_timeout') === 'true'
    const timeoutId = sessionStorage.getItem('vm3_timeout_id')

    if (timeoutId) {
      clearTimeout(parseInt(timeoutId))
      sessionStorage.removeItem('vm3_timeout_id')
    }

    if (isTimeout) {
      sessionStorage.removeItem('vm3_logout_timeout')
    }

    const run = async () => {
      if (flow === 'vm3' || isTimeout) {
        sessionStorage.removeItem('logout_flow')
        clearVM3Storage()

        if (!isTimeout) {
          restoreVM3SessionData()
        }

        await logout()
      } else {
        localStorage.removeItem('oidc_session')
        localStorage.removeItem('oidc_tokens')
        storeLogout()
        router.replace('/auth/login')
      }
    }

    run()
  }, [router, storeLogout, logout])

  return <div>Signing you out...</div>
}
