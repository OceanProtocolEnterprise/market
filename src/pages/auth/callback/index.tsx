import type { GetServerSideProps } from 'next'
import { authConfig } from '../../../config/auth.config'

export default function AuthCallback() {
  return null
}

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  if (!authConfig.enabled) {
    return {
      redirect: {
        destination: '/',
        permanent: false
      }
    }
  }

  const searchParams = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => searchParams.append(key, entry))
      return
    }

    if (typeof value === 'string') {
      searchParams.set(key, value)
    }
  })

  return {
    redirect: {
      destination: `/api/auth/callback${
        searchParams.toString() ? `?${searchParams.toString()}` : ''
      }`,
      permanent: false
    }
  }
}
