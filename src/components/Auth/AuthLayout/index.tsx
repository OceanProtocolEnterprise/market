import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '@hooks/useAuth'
import { authConfig } from '../../../config/auth.config'
import LoginForm from '../Login/LoginForm'
import SignupForm from '../Signup/SignupForm'
import {
  authTabLabels,
  OIDC_LOGOUT_PENDING_KEY,
  OIDC_LOGOUT_RETURN_FALLBACK_MS,
  type AuthPanelContent,
  type AuthTab
} from '../constants'
import BrandPanel from './BrandPanel'
import LogoutPanel from './LogoutPanel'
import SetupPanel from './SetupPanel'
import styles from './index.module.css'

interface AuthLayoutProps {
  content: AuthPanelContent
  initialTab?: AuthTab
}

export default function AuthLayout({
  content,
  initialTab = 'login'
}: AuthLayoutProps) {
  const { isAuthenticated, isLogoutPending } = useAuth()
  const router = useRouter()
  const signupEnabled = Boolean(authConfig.oidc.signupFlow)
  const resolvedInitialTab = signupEnabled ? initialTab : 'login'
  const [activeTab, setActiveTab] = useState<AuthTab>(resolvedInitialTab)
  const [storedLogoutPending, setStoredLogoutPending] = useState(
    () =>
      typeof window !== 'undefined' &&
      sessionStorage.getItem(OIDC_LOGOUT_PENDING_KEY) === 'true'
  )
  const showLogoutPending = isLogoutPending || storedLogoutPending

  useEffect(() => {
    setActiveTab(resolvedInitialTab)
  }, [resolvedInitialTab])

  // ?loggedout=1 signals a clean logout completed via /api/auth/logout/continue
  useEffect(() => {
    if (!router.isReady || router.query.loggedout !== '1') return
    sessionStorage.removeItem(OIDC_LOGOUT_PENDING_KEY)
    setStoredLogoutPending(false)
    const { loggedout: _, ...rest } = router.query
    router.replace({ pathname: router.pathname, query: rest }, undefined, {
      shallow: true
    })
  }, [router])

  // Fallback: if logout is done but callback didn't send ?loggedout=1
  useEffect(() => {
    if (!storedLogoutPending || isAuthenticated || isLogoutPending) return
    const timer = setTimeout(() => {
      sessionStorage.removeItem(OIDC_LOGOUT_PENDING_KEY)
      setStoredLogoutPending(false)
    }, OIDC_LOGOUT_RETURN_FALLBACK_MS)
    return () => clearTimeout(timer)
  }, [storedLogoutPending, isAuthenticated, isLogoutPending])

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <BrandPanel content={content} />
        <div className={styles.formPanel}>
          {!isAuthenticated && !showLogoutPending && (
            <div className={styles.pillTabs}>
              <button
                type="button"
                className={`${styles.pillTab} ${
                  activeTab === 'login' ? styles.pillTabActive : ''
                }`}
                onClick={() => setActiveTab('login')}
              >
                {authTabLabels.login}
              </button>
              {signupEnabled && (
                <button
                  type="button"
                  className={`${styles.pillTab} ${
                    activeTab === 'signup' ? styles.pillTabActive : ''
                  }`}
                  onClick={() => setActiveTab('signup')}
                >
                  {authTabLabels.signup}
                </button>
              )}
            </div>
          )}

          <div className={styles.formContent}>
            {showLogoutPending ? (
              <LogoutPanel />
            ) : isAuthenticated ? (
              <SetupPanel />
            ) : activeTab === 'login' ? (
              <LoginForm />
            ) : (
              <SignupForm />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
