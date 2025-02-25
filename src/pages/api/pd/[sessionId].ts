import { LoggerInstance } from '@oceanprotocol/lib'
import { serverSidePresentationDefinition } from '@utils/wallet/policyServer'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const { sessionId } = req.query
      const response = await serverSidePresentationDefinition(
        typeof sessionId === 'string' ? sessionId : sessionId[0]
      )

      res.status(200).json(response)
    } catch (error) {
      LoggerInstance.error(error)
      res.status(500).json(error)
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' })
  }
}
