import NextAuth, { AuthOptions } from 'next-auth' // <-- IMPORT AuthOptions
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare, hash } from 'bcrypt'

export const authOptions: AuthOptions = {
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/login',
    error: '/login'
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials, req) {
        // 1. QUERY YOUR DATABASE HERE (fetch the user and their hash)
        // const user = await db.user.findUnique({ where: { email: credentials.email } })

        // MOCK USER for this example:
        const user = {
          id: '1',
          name: 'John Doe',
          email: 'test@test.com',
          passwordHash:
            '$2b$10$IIAcoJaRhnR0rPFyr.sBDun.JwTmsoORoVT//ghaV3xZ17fOZvBDO' // 'test' hashed
        }

        // --- 2. CHECK IF USER EXISTS & PASSWORD MATCHES ---
        if (!user) {
          return null // User not found
        }
        const hashedPassword = await hash('test', 10)
        console.log(hashedPassword)
        // **USE compare() HERE**
        console.log(
          'Comparing password for user:',
          user.email,
          credentials?.password,
          user.passwordHash,
          hashedPassword
        )
        const passwordCorrect = await compare(
          credentials?.password || '', // Plain text password from the form
          user.passwordHash // Hashed password from the database
        )
        console.log('Password correct:', passwordCorrect)

        if (passwordCorrect) {
          // Passwords match, return user object
          return { id: user.id, name: user.name, email: user.email }
        }

        // Passwords do not match
        return null
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET
}

// Export the handler function
export default NextAuth(authOptions)
