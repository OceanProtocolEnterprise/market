import { useState, ReactElement } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import styles from './login/Login.module.css'

export default function LoginPage(): ReactElement {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const result = await signIn('credentials', {
      redirect: false,
      email,
      password
    })

    if (result?.error) {
      setError('Invalid email or password.')
    } else {
      router.push('/')
    }
  }

  if (status === 'loading') {
    return (
      <div className={styles.container}>
        <p>Loading...</p>
      </div>
    )
  }

  if (status === 'authenticated') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Welcome back!</h1>
          <p className={styles.logoutText}>
            Logged in as <strong>{session.user?.email}</strong>
          </p>

          <button
            onClick={() => router.push('/')}
            className={styles.buttonPrimary}
          >
            Go to Home
          </button>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className={styles.buttonSecondary}
          >
            Log Out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.card}>
        <h1 className={styles.title}>Login</h1>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.formGroup}>
          <label className={styles.label}>Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            placeholder="name@example.com"
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            placeholder="••••••••"
            required
          />
        </div>

        <button type="submit" className={styles.buttonPrimary}>
          Sign In
        </button>
      </form>
    </div>
  )
}
