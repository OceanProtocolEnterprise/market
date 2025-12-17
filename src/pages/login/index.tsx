import { useState, ReactElement, useEffect } from 'react'
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
  const [success, setSuccess] = useState('') // New success state

  // Clear messages when switching modes
  useEffect(() => {
    setError('')
    setSuccess('')
  }, [isRegistering])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (isRegistering) {
      console.log('Registering user:', { email, password })

      // 1. Set the success message first
      setSuccess('Registration successful!')

      // 2. Wait a moment so the user actually sees the green box
      setTimeout(() => {
        setIsRegistering(false)
        setPassword('')
        // Optionally keep the success message visible on the login screen
        setSuccess('Account created! You can now sign in.')
      }, 2000)

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
          <h1 className={styles.title}>Welcome back!</h1>
          <button
            onClick={() => router.push('/')}
            className={styles.buttonPrimary}
          >
            Go to Home
          </button>
          <button
            onClick={() => signOut()}
            className={styles.buttonSecondary}
            style={{ marginTop: '10px' }}
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

        {/* Feedback Mechanism */}
        {error && <div className={styles.errorFeedback}>{error}</div>}
        {success && <div className={styles.successFeedback}>{success}</div>}

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
          <span>
            {isRegistering
              ? 'Already have an account?'
              : "Don't have an account?"}
          </span>
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
