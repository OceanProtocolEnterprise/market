import { useFormikContext } from 'formik'
import { useEffect, useState } from 'react'
import { MetadataEditForm, FormAdditionalLicenseFile } from './_types'
import { deleteIpfsFile, uploadFileItemToIPFS } from '@utils/ipfs'
import { FileItem } from '@utils/fileItem'
import { RemoteObject } from 'src/@types/ddo/RemoteObject'
import { RemoteSource } from 'src/@types/ddo/RemoteSource'
import { LoggerInstance } from '@oceanprotocol/lib'
import appConfig from 'app.config.cjs'
import { toast } from 'react-toastify'
import { useAsset } from '@context/Asset'
import {
  createEmptyUrlFileInfo,
  reindexBooleanMapAfterDeletion,
  additionalLicenseSourceOptions,
  inferNameFromUrl
} from '@components/Publish/_license'
import { AdditionalLicenseSourceType } from '@components/Publish/_types'

export default function useEditMetadata() {
  const { asset } = useAsset()
  const { values, setFieldValue, setFieldTouched, setFieldError } =
    useFormikContext<MetadataEditForm>()
  const [additionalFilesUploading, setAdditionalFilesUploading] = useState<
    Record<number, boolean>
  >({})
  const [additionalFilesDeleting, setAdditionalFilesDeleting] = useState<
    Record<number, boolean>
  >({})

  function isPrimaryLicenseReady(): boolean {
    if (values.useRemoteLicense) {
      return !!values.uploadedLicense?.licenseDocuments?.[0]
    }
    return !!values.licenseUrl?.[0]?.valid
  }

  async function updateLicenseDocuments(
    additionalFiles: FormAdditionalLicenseFile[]
  ) {
    let mainLicenseDoc: RemoteObject | undefined

    if (
      values.useRemoteLicense &&
      values.uploadedLicense?.licenseDocuments?.[0]
    ) {
      mainLicenseDoc = values.uploadedLicense.licenseDocuments[0]
    } else if (!values.useRemoteLicense && values.licenseUrl?.[0]?.valid) {
      const urlDoc = values.licenseUrl[0]
      mainLicenseDoc = {
        name: urlDoc.url?.split('/').pop() || urlDoc.url || 'license',
        fileType: urlDoc.type || 'url',
        sha256: urlDoc.checksum || '',
        mirrors: [
          {
            url: urlDoc.url,
            type: urlDoc.type || 'url',
            method: urlDoc.method || 'get'
          }
        ]
      }
    }

    const licenseDocs: RemoteObject[] = []

    if (mainLicenseDoc) {
      licenseDocs.push(mainLicenseDoc)
    }

    additionalFiles.forEach((file) => {
      if (file.sourceType === 'Upload file' && file.uploadedDocument) {
        licenseDocs.push(file.uploadedDocument)
      } else if (file.sourceType === 'URL' && file.url?.[0]?.valid) {
        const urlDoc = file.url[0]
        licenseDocs.push({
          name:
            file.name ||
            urlDoc.url?.split('/').pop() ||
            urlDoc.url ||
            'license',
          fileType: urlDoc.type || 'url',
          sha256: urlDoc.checksum || '',
          mirrors: [
            {
              url: urlDoc.url,
              type: urlDoc.type || 'url',
              method: urlDoc.method || 'get'
            }
          ]
        })
      }
    })

    if (licenseDocs.length > 0) {
      await setFieldValue('license', {
        name: licenseDocs[0]?.name || 'license',
        licenseDocuments: licenseDocs
      })
    }
  }

  useEffect(() => {
    const loadExistingAdditionalLicenses = async () => {
      const existingLicenseDocs =
        asset.credentialSubject?.metadata?.license?.licenseDocuments || []

      const additionalDocs = existingLicenseDocs.slice(1)

      if (additionalDocs.length > 0) {
        const loadedFiles: FormAdditionalLicenseFile[] = additionalDocs.map(
          (doc: any, index: number) => {
            const isUrlSource = doc.mirrors?.[0]?.type === 'url'

            if (isUrlSource) {
              return {
                id: `existing-${index}-${Date.now()}`,
                name: doc.name || '',
                sourceType: 'URL' as const,
                url: [
                  {
                    url: doc.mirrors?.[0]?.url || '',
                    type: 'url' as const,
                    valid: true,
                    checksum: doc.sha256 || '',
                    method: doc.mirrors?.[0]?.method || 'get'
                  }
                ]
              }
            } else {
              return {
                id: `existing-${index}-${Date.now()}`,
                name: doc.name || '',
                sourceType: 'Upload file' as const,
                url: [],
                uploadedDocument: doc
              }
            }
          }
        )

        await setFieldValue('additionalLicenseFiles', loadedFiles, false)
        await updateLicenseDocuments(loadedFiles)
      }
    }

    if (
      asset?.credentialSubject?.metadata?.license?.licenseDocuments?.length > 1
    ) {
      loadExistingAdditionalLicenses()
    }
  }, [asset, setFieldValue])

  useEffect(() => {
    const additionalFiles = values.additionalLicenseFiles || []
    if (!additionalFiles.length) return

    const updatedFiles = additionalFiles.map((additionalFile) => {
      if (!additionalFile || additionalFile.name?.trim()) return additionalFile
      if (additionalFile.sourceType !== 'URL') return additionalFile

      const url = additionalFile.url?.[0]?.url?.trim()
      if (!url || !additionalFile.url?.[0]?.valid) return additionalFile

      return {
        ...additionalFile,
        name: inferNameFromUrl(url)
      }
    })

    const hasUpdates = updatedFiles.some(
      (additionalFile, index) => additionalFile !== additionalFiles[index]
    )
    if (hasUpdates) {
      setFieldValue('additionalLicenseFiles', updatedFiles)
    }
  }, [values.additionalLicenseFiles, setFieldValue])

  function getAdditionalFilesSnapshot(): FormAdditionalLicenseFile[] {
    return [...(values.additionalLicenseFiles || [])]
  }

  async function setAdditionalFiles(
    additionalFiles: FormAdditionalLicenseFile[],
    shouldValidate = true
  ) {
    await setFieldValue(
      'additionalLicenseFiles',
      additionalFiles,
      shouldValidate
    )
  }

  function getRemoteObjectFromFileItem(
    fileItem: FileItem,
    remoteSource: RemoteSource
  ): RemoteObject {
    const fileType = fileItem.name.split('.').pop() || ''
    return {
      name: fileItem.name,
      fileType,
      sha256: fileItem.checksum,
      additionalInformation: {
        size: fileItem.size
      },
      description: {
        '@value': '',
        '@direction': '',
        '@language': ''
      },
      displayName: {
        '@value': fileItem.name,
        '@language': '',
        '@direction': ''
      },
      mirrors: [remoteSource]
    }
  }

  async function unpinUploadedDocument(document?: RemoteObject) {
    const ipfsHash = document?.mirrors?.[0]?.ipfsCid
    if (!appConfig.ipfsUnpinFiles || !ipfsHash || ipfsHash.length === 0) {
      return
    }

    try {
      await deleteIpfsFile(ipfsHash)
    } catch {
      LoggerInstance.error("Can't delete license file")
    }
  }

  async function handleAdditionalFileUpload(
    index: number,
    fileItem: FileItem,
    onError: () => void
  ) {
    setAdditionalFilesUploading((prev) => ({ ...prev, [index]: true }))

    try {
      const remoteSource = await uploadFileItemToIPFS(fileItem)
      const remoteObject = getRemoteObjectFromFileItem(fileItem, remoteSource)
      const additionalFiles = getAdditionalFilesSnapshot()
      const currentName = additionalFiles[index]?.name

      additionalFiles[index] = {
        ...additionalFiles[index],
        name: currentName?.trim() ? currentName : fileItem.name,
        url: [],
        uploadedDocument: remoteObject
      }
      await setAdditionalFiles(additionalFiles)
      await updateLicenseDocuments(additionalFiles)
    } catch (error) {
      toast.error('Could not upload file')
      LoggerInstance.error(error)

      const additionalFiles = getAdditionalFilesSnapshot()
      additionalFiles[index] = {
        ...additionalFiles[index],
        uploadedDocument: undefined
      }
      await setAdditionalFiles(additionalFiles)
      onError()
    } finally {
      setAdditionalFilesUploading((prev) => {
        const next = { ...prev }
        delete next[index]
        return next
      })
    }
  }

  async function handleNewAdditionalFile() {
    if (!isPrimaryLicenseReady()) return

    const additionalFiles = getAdditionalFilesSnapshot()
    const newIndex = additionalFiles.length

    const newFile: FormAdditionalLicenseFile = {
      id: `new-${Date.now()}-${Math.random()}`,
      name: '',
      sourceType: 'URL',
      url: [{ url: '', type: 'url', valid: false }]
    }

    additionalFiles.push(newFile)
    await setAdditionalFiles(additionalFiles, false)

    setFieldTouched(`additionalLicenseFiles[${newIndex}].name`, false, false)
    setFieldTouched(`additionalLicenseFiles[${newIndex}].url`, false, false)
    setFieldTouched(
      `additionalLicenseFiles[${newIndex}].url[0].url`,
      false,
      false
    )
    setFieldError(`additionalLicenseFiles[${newIndex}].name`, undefined)
    setFieldError(`additionalLicenseFiles[${newIndex}].url`, undefined)
  }

  async function handleDeleteAdditionalFile(index: number) {
    setAdditionalFilesDeleting((prev) => ({ ...prev, [index]: true }))

    try {
      const additionalFiles = getAdditionalFilesSnapshot()
      const additionalFile = additionalFiles[index]

      await unpinUploadedDocument(additionalFile?.uploadedDocument)
      additionalFiles.splice(index, 1)
      await setAdditionalFiles(additionalFiles)
      await updateLicenseDocuments(additionalFiles)

      setAdditionalFilesUploading((prev) =>
        reindexBooleanMapAfterDeletion(prev, index)
      )
    } finally {
      setAdditionalFilesDeleting((prev) =>
        reindexBooleanMapAfterDeletion(prev, index)
      )
    }
  }

  async function handleAdditionalFileSourceChange(
    index: number,
    sourceType: AdditionalLicenseSourceType
  ) {
    const additionalFiles = getAdditionalFilesSnapshot()
    const currentAdditionalFile = additionalFiles[index]

    if (
      currentAdditionalFile?.sourceType === 'Upload file' &&
      sourceType === 'URL'
    ) {
      await unpinUploadedDocument(currentAdditionalFile.uploadedDocument)
    }

    additionalFiles[index] = {
      id: currentAdditionalFile?.id || `new-${Date.now()}-${Math.random()}`,
      name: currentAdditionalFile?.name || '',
      sourceType,
      url: sourceType === 'URL' ? [{ url: '', type: 'url', valid: false }] : [],
      uploadedDocument:
        sourceType === 'Upload file'
          ? currentAdditionalFile?.uploadedDocument
          : undefined
    }

    await setAdditionalFiles(additionalFiles)
  }

  async function handleAdditionalFileUrlValidate(
    index: number,
    url: string,
    isValid: boolean,
    fileData?: any
  ) {
    const additionalFiles = getAdditionalFilesSnapshot()

    if (isValid && fileData) {
      const fileName = fileData.name || inferNameFromUrl(url)

      additionalFiles[index] = {
        ...additionalFiles[index],
        url: [
          {
            url,
            type: 'url',
            valid: true,
            checksum: fileData.checksum,
            method: fileData.method || 'get',
            contentLength: fileData.contentLength,
            contentType: fileData.contentType
          }
        ],
        name: additionalFiles[index]?.name || fileName
      }

      await setAdditionalFiles(additionalFiles)

      await updateLicenseDocuments(additionalFiles)

      setFieldTouched(`additionalLicenseFiles[${index}].url`, true, false)
    } else {
      additionalFiles[index] = {
        ...additionalFiles[index],
        url: [
          {
            url,
            type: 'url',
            valid: false
          }
        ]
      }
      await setAdditionalFiles(additionalFiles)
    }
  }

  async function handleResetPrimaryUploadedLicense() {
    await unpinUploadedDocument(values.uploadedLicense?.licenseDocuments?.[0])

    const additionalFiles = values.additionalLicenseFiles || []
    await Promise.all(
      additionalFiles.map((file) =>
        unpinUploadedDocument(file.uploadedDocument)
      )
    )

    await setFieldValue('additionalLicenseFiles', [])
    await setFieldValue('uploadedLicense', undefined)
  }

  const additionalFiles = values.additionalLicenseFiles || []
  const primaryLicenseReady = isPrimaryLicenseReady()

  return {
    values,
    asset,
    additionalFiles,
    additionalFilesUploading,
    additionalFilesDeleting,
    additionalFileSourceOptions: additionalLicenseSourceOptions,
    primaryLicenseReady,
    handleAdditionalFileUpload,
    handleNewAdditionalFile,
    handleDeleteAdditionalFile,
    handleAdditionalFileSourceChange,
    handleAdditionalFileUrlValidate,
    handleResetPrimaryUploadedLicense
  }
}
