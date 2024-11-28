import * as isIPFS from 'is-ipfs'
import pinataSDK from '@pinata/sdk'

export function isCID(value: string) {
  return isIPFS.cid(value)
}

export async function uploadToIPFS(
  data: any,
  ipfsApiKey: string,
  ipfsSecretApiKey: string
): Promise<string> {
  try {
    if (!(ipfsApiKey && ipfsSecretApiKey)) {
      console.error('ERROR: SET IPFS_API_KEY and IPFS_SECRET_API_KEY')
    }

    // eslint-disable-next-line new-cap
    const pinata = new pinataSDK(ipfsApiKey, ipfsSecretApiKey)
    const result = await pinata.pinJSONToIPFS(data)
    return result.IpfsHash // This is the IPFS CID
  } catch (error) {
    console.log('error:', error)
    throw new Error('Failed to upload data to Pinata')
  }
}
