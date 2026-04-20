import { useEffect, useState } from 'react'
import { useAuth } from '@hooks/useAuth'
import LoginForm from '../Login/LoginForm'
import SignupForm from '../Signup/SignupForm'
import {
  authTabLabels,
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
  const { isAuthenticated, isLoading, isLogoutPending } = useAuth()
  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab)

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <BrandPanel content={content} />
        <div className={styles.formPanel}>
          {!isAuthenticated && !isLogoutPending && !isLoading && (
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
              <button
                type="button"
                className={`${styles.pillTab} ${
                  activeTab === 'signup' ? styles.pillTabActive : ''
                }`}
                onClick={() => setActiveTab('signup')}
              >
                {authTabLabels.signup}
              </button>
            </div>
          )}

          <div className={styles.formContent}>
            {isLogoutPending ? (
              <LogoutPanel />
            ) : isLoading && !isAuthenticated ? (
              <div>Checking your session...</div>
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
