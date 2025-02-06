import { LoggerInstance } from '@oceanprotocol/lib'
import appConfig from 'app.config'
import axios from 'axios'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const response = await axios.get(
        `${appConfig.ssiWalletApi}/wallet-api/auth/account/web3/nonce`
      )
      res.status(200).json(response.data)
    } catch (error) {
      LoggerInstance.error(error.response)
      res.status(500).json({
        success: false,
        error: 'Could not get nonce from wallet api endpoint'
      })
    }
  }
}
