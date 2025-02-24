/* eslint-disable camelcase */
import { LoggerInstance } from '@oceanprotocol/lib'
import { serverSidePresentationRequest } from '@utils/wallet/policyServer'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const { sessionId } = req.query
      const { vp_token } = req.body
      console.log(vp_token)
      const response = await serverSidePresentationRequest(
        typeof sessionId === 'string' ? sessionId : sessionId[0],
        typeof vp_token === 'string' ? vp_token : vp_token[0]
      )

      res.status(200).json(response)
    } catch (error) {
      LoggerInstance.error(error.data)
      res.status(500).json(error.data)
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' })
  }
}
