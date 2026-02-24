import { LoggerInstance } from '@oceanprotocol/lib'
import { serverSideDeleteIpfsFile, serverSideUploadToIpfs } from '@utils/ipfs'
import { NextApiRequest, NextApiResponse } from 'next'

const IPFS_JWT_ENV_KEY = 'IPFS_JWT'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const ipfsJWT = process.env[IPFS_JWT_ENV_KEY]

  if (req.method === 'POST') {
    try {
      const body =
        typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      const data = await serverSideUploadToIpfs(body, ipfsJWT)
      res.status(200).json({ success: true, data })
    } catch (error) {
      LoggerInstance.error(error.message)
      res.status(500).json({
        success: false,
        error: error.message || 'Could not upload the file to the IPFS provider'
      })
    }
  } else if (req.method === 'DELETE') {
    try {
      await serverSideDeleteIpfsFile(req.body, ipfsJWT)
      res.status(200).json({ success: true })
    } catch (error) {
      LoggerInstance.error(error.message)
      res.status(500).json({
        success: false,
        error: 'Could not delete the file on the IPFS provider'
      })
    }
  } else {
    res.status(405).json({ success: false, message: 'Method not allowed' })
  }
}
