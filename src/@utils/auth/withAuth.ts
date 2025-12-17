// lib/withAuth.ts

import {
  GetServerSideProps,
  GetServerSidePropsContext,
  GetServerSidePropsResult
} from 'next'
import { getSession } from 'next-auth/react'
import { Session } from 'next-auth'

export interface AuthRequiredProps {
  session: Session
}

/**
 * A Higher-Order function for GetServerSideProps that ensures a user is authenticated.
 * If no session is found, it redirects to the login page.
 *
 * It allows chaining additional getServerSideProps logic after successful authentication.
 *
 * @param innerSsrFunction - An optional function for fetching additional, authenticated data.
 * It only runs if the session is valid.
 * @returns A Next.js GetServerSideProps function ready for export.
 */
export function withAuth(
  innerSsrFunction?: GetServerSideProps<any>
): GetServerSideProps {
  return async (
    context: GetServerSidePropsContext
  ): Promise<GetServerSidePropsResult<any>> => {
    // 1. Core Authentication Check
    const session = await getSession(context)

    console.log('Running withAuth check. Session found:', !!session)

    if (!session) {
      // Redirect to login if no session is found
      return {
        redirect: {
          destination: '/login',
          permanent: false
        }
      }
    }

    // 2. Run Optional Inner Logic (if provided)
    if (innerSsrFunction) {
      // Execute the page-specific SSR logic
      const innerResult = await innerSsrFunction(context)

      // If the inner logic returned a redirect or notFound, we return that immediately
      if ('redirect' in innerResult || 'notFound' in innerResult) {
        return innerResult
      }

      // If successful, merge the session into the inner props
      return {
        ...innerResult,
        props: {
          ...innerResult.props,
          session // Ensure the session is always passed to the component
        }
      }
    }

    // 3. Fallback: If no inner logic, just return the session
    return {
      props: {
        session
      }
    }
  }
}
