import { useState, ReactElement } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/router'

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

    console.log('Login result:', result)

    if (result?.error) {
      setError('Invalid email or password.')
    } else {
      console.log('Login successful.')
      // Redirect after successful login
      router.push('/')
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (status === 'authenticated') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="p-8 border rounded shadow-md w-80 text-center">
          <h1 className="text-xl font-bold mb-4">You are already logged in!</h1>
          <p className="mb-4">Welcome back, **{session.user?.email}**.</p>

          {/* Add Go to Home button */}
          <button
            onClick={() => router.push('/')}
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 mb-3"
          >
            Go to Home
          </button>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full bg-red-500 text-white p-2 rounded hover:bg-red-600"
          >
            Log Out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="p-8 border rounded shadow-md w-80"
      >
        <h1 className="text-xl font-bold mb-4">Login</h1>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <div className="mb-4">
          <label className="block mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border p-2 rounded text-black"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border p-2 rounded text-black"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Sign In
        </button>
      </form>
    </div>
  )
}
