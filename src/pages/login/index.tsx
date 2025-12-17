import { useState, ReactElement } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import styles from './Login.module.css'

export default function LoginPage(): ReactElement {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (isRegistering) {
      // Mock Registration Logic
      console.log('Registering user with:', { email, password })
      alert('Mock registration successful! Now please login.')
      setIsRegistering(false)
      return
    }

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

  if (status === 'loading')
    return <div className={styles.container}>Loading...</div>

  if (status === 'authenticated') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Welcome!</h1>
          <button
            onClick={() => router.push('/')}
            className={styles.buttonPrimary}
          >
            Go to Home
          </button>
          <button
            onClick={() => signOut()}
            className={styles.buttonPrimary}
            style={{ marginTop: '10px', backgroundColor: '#e53e3e' }}
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
        <h1 className={styles.title}>
          {isRegistering ? 'Create Account' : 'Login'}
        </h1>

        {error && (
          <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>
        )}

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

        <button
          type="submit"
          className={`${styles.buttonPrimary} ${
            isRegistering ? styles.buttonRegister : ''
          }`}
        >
          {isRegistering ? 'Register' : 'Sign In'}
        </button>

        <div className={styles.toggleContainer}>
          {isRegistering
            ? 'Already have an account?'
            : "Don't have an account?"}
          <button
            type="button"
            className={styles.toggleButton}
            onClick={() => setIsRegistering(!isRegistering)}
          >
            {isRegistering ? 'Login here' : 'Register here'}
          </button>
        </div>
      </form>
    </div>
  )
}
