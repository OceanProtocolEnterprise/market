import { LoggerInstance } from '@oceanprotocol/lib'
import appConfig from 'app.config'
import axios from 'axios'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const response = await axios.post(
        `${appConfig.ssiWalletApi}/wallet-api/auth/account/web3/signed`,
        req.body
      )

      if (response.data?.token) {
        res.setHeader(
          'Set-Cookie',
          `ktor-authnz-auth=${response.data?.token}; Path=/; HttpOnly; SameSite=Strict; $x-enc=URI_ENCODING`
        )
      }

      res.status(200).json({ success: true, sessionToken: response.data })
    } catch (error) {
      LoggerInstance.error(error.response)
      res.status(500).json({
        success: false,
        error: 'Could not get session token from wallet api endpoint'
      })
    }
  }
}
