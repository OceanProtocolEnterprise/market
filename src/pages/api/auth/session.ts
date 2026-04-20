import type { NextApiRequest, NextApiResponse } from 'next'
import { getSessionUser, readSession } from '@server/auth/session'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await readSession(req)
  const user = getSessionUser(session)

  res.status(200).json({
    user,
    isAuthenticated: Boolean(user)
  })
}
