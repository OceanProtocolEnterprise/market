import { FileInfo } from '@oceanprotocol/lib'

export interface S3AccessConfig {
  endpoint: string
  region?: string
  bucket: string
  objectKey: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle?: boolean
}

export interface S3FileInfo extends FileInfo {
  type: 's3'
  s3Access: S3AccessConfig
}

export interface FormFileData extends FileInfo {
  url?: string
  query?: string
  transactionId?: string
  address?: string
  abi?: string
  headers?: { key: string; value: string }[]
  s3Access?: S3AccessConfig
  method?: string
  valid?: boolean
  contentType?: string
  contentLength?: string
  [key: string]: any
}

export function isS3File(file: FileInfo): file is S3FileInfo {
  return file.type === 's3'
}

export function getS3Access(file: FileInfo): S3AccessConfig | undefined {
  return isS3File(file) ? file.s3Access : undefined
}
