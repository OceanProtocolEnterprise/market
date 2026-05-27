import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = req.cookies.dfns_token
  if (!token) {
    return res.status(401).json({ error: 'Dfns SSO login is required.' })
  }

  return res.status(200).json({ token })
}
