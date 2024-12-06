import * as isIPFS from 'is-ipfs'
import pinataSDK from '@pinata/sdk'
import { FileItem } from '@utils/fileItem'
import { RemoteSource } from '../@types/ddo/RemoteSource'
import axios from 'axios'

export interface IpfsRemoteDocument {
  content: string
  filename: string
}

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

export async function uploadFileItemToIPFS(
  fileItem: FileItem,
  ipfsApiKey: string,
  ipfsSecretApiKey: string
): Promise<RemoteSource> {
  const remoteDocument: IpfsRemoteDocument = {
    content: fileItem.content,
    filename: fileItem.file.name
  }

  const ipfsHash = await uploadToIPFS(
    remoteDocument,
    ipfsApiKey,
    ipfsSecretApiKey
  )

  return {
    type: 'ipfs',
    ipfsCid: ipfsHash,
    headers: {}
  }
}

export async function downloadRemoteSourceFromIpfs(
  ipfsHash: string,
  ipfsGateway: string
): Promise<IpfsRemoteDocument | null> {
  if (!ipfsGateway) {
    console.error('ERROR: SET IPFS_GATEWAY')
    return null
  }

  try {
    console.log(`${ipfsGateway}/ipfs/${ipfsHash}`)
    const response = await axios.get(`${ipfsGateway}/ipfs/${ipfsHash}`)

    console.log('File content:', response.data)

    return response.data
  } catch (error) {
    console.error('Error fetching the file from IPFS:', error)
  }
}
