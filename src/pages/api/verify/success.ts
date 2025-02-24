import { LoggerInstance } from '@oceanprotocol/lib'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      console.log('success')
      res.status(200).json({ message: `success` })
    } catch (error) {
      LoggerInstance.error(error.data)
      res.status(500).json(error.data)
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' })
  }
}
