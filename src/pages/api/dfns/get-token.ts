// pages/api/dfns/get-token.ts
import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.cookies.dfns_token

  if (!token) {
    return res.status(401).json({
      error: 'No token found'
    })
  }

  return res.status(200).json({
    token
  })
}
