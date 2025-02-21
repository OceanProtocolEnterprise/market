import { LoggerInstance } from '@oceanprotocol/lib'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      console.log('verify')
      const { sessionId } = req.query
      res.status(200).json({ message: `The sessionId is: ${sessionId}` })
    } catch (error) {
      LoggerInstance.error(error.message)
      res.status(500).json({
        success: false,
        error: ''
      })
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' })
  }
}
