import { useField, useFormikContext } from 'formik'
import { createElement, useEffect, useMemo, useState } from 'react'
import content from '../../../../content/publish/form.json'
import { getFieldContent } from '@utils/form'
import { deleteIpfsFile, uploadFileItemToIPFS } from '@utils/ipfs'
import { FileItem } from '@utils/fileItem'
import { License } from 'src/@types/ddo/License'
import { RemoteObject } from 'src/@types/ddo/RemoteObject'
import { RemoteSource } from 'src/@types/ddo/RemoteSource'
import { LoggerInstance } from '@oceanprotocol/lib'
import appConfig from 'app.config.cjs'
import { toast } from 'react-toastify'
import { BoxSelectionOption } from '@shared/FormInput/InputElement/BoxSelection'
import IconDataset from '@images/dataset.svg'
import IconAlgorithm from '@images/algorithm.svg'
import { algorithmContainerPresets } from '../_constants'
import {
  additionalLicenseSourceOptions,
  createEmptyAdditionalLicenseFile,
  createEmptyUrlFileInfo,
  getAdditionalLicenseSubtext,
  inferNameFromUrl,
  isPrimaryLicenseReady,
  reindexBooleanMapAfterDeletion
} from '../_license'
import { AdditionalLicenseSourceType, FormPublishData } from '../_types'

const assetTypeOptionsTitles = getFieldContent(
  'type',
  content.metadata.fields
).options

export default function useMetadata() {
  const { values, setFieldValue, setFieldTouched, setFieldError } =
    useFormikContext<FormPublishData>()
  const [additionalFilesUploading, setAdditionalFilesUploading] = useState<
    Record<number, boolean>
  >({})
  const [additionalFilesDeleting, setAdditionalFilesDeleting] = useState<
    Record<number, boolean>
  >({})
  const [, meta] = useField('metadata.dockerImageCustomChecksum')

  const assetTypeOptions: BoxSelectionOption[] = useMemo(
    () => [
      {
        name: assetTypeOptionsTitles[0].toLowerCase(),
        title: assetTypeOptionsTitles[0],
        checked:
          values.metadata.type === assetTypeOptionsTitles[0].toLowerCase(),
        icon: createElement(IconDataset)
      },
      {
        name: assetTypeOptionsTitles[1].toLowerCase(),
        title: assetTypeOptionsTitles[1],
        checked:
          values.metadata.type === assetTypeOptionsTitles[1].toLowerCase(),
        icon: createElement(IconAlgorithm)
      }
    ],
    [values.metadata.type]
  )

  const dockerImageOptions: BoxSelectionOption[] = useMemo(
    () => [
      ...algorithmContainerPresets.map((preset) => ({
        name: `${preset.image}:${preset.tag}`,
        title: `${preset.image}:${preset.tag}`,
        checked: values.metadata.dockerImage === `${preset.image}:${preset.tag}`
      })),
      {
        name: 'custom',
        title: 'Custom',
        checked: values.metadata.dockerImage === 'custom'
      }
    ],
    [values.metadata.dockerImage]
  )

  useEffect(() => {
    setFieldValue(
      'services[0].access',
      values.metadata.type === 'algorithm' ? 'compute' : 'access'
    )
    setFieldValue(
      'services[0].algorithmPrivacy',
      values.metadata.type === 'algorithm'
    )
  }, [setFieldValue, values.metadata.type])

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

  async function handleLicenseFileUpload(
    fileItem: FileItem,
    onError: () => void
  ) {
    try {
      const remoteSource = await uploadFileItemToIPFS(fileItem)
      const remoteObject = getRemoteObjectFromFileItem(fileItem, remoteSource)

      const license: License = {
        name: fileItem.name,
        licenseDocuments: [remoteObject]
      }

      setFieldValue('metadata.uploadedLicense', license)
    } catch (error) {
      toast.error('Could not upload file')
      LoggerInstance.error(error)
      setFieldValue('metadata.uploadedLicense', undefined)
      onError()
    }
  }

  async function handleAdditionalFileUpload(
    index: number,
    fileItem: FileItem,
    onError: () => void
  ) {
    setAdditionalFilesUploading((prev) => ({
      ...prev,
      [index]: true
    }))

    try {
      const remoteSource = await uploadFileItemToIPFS(fileItem)
      const remoteObject = getRemoteObjectFromFileItem(fileItem, remoteSource)
      const additionalFiles = [
        ...(values.metadata.additionalLicenseFiles || [])
      ]

      additionalFiles[index] = {
        ...additionalFiles[index],
        name: fileItem.name,
        uploadedDocument: remoteObject
      }
      await setFieldValue('metadata.additionalLicenseFiles', additionalFiles)
    } catch (error) {
      toast.error('Could not upload file')
      LoggerInstance.error(error)

      const additionalFiles = [
        ...(values.metadata.additionalLicenseFiles || [])
      ]
      additionalFiles[index] = {
        ...additionalFiles[index],
        uploadedDocument: undefined
      }
      await setFieldValue('metadata.additionalLicenseFiles', additionalFiles)
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
    if (!isPrimaryLicenseReady(values.metadata)) return

    const additionalFiles = [...(values.metadata.additionalLicenseFiles || [])]
    const newIndex = additionalFiles.length
    additionalFiles.push(createEmptyAdditionalLicenseFile())
    await setFieldValue(
      'metadata.additionalLicenseFiles',
      additionalFiles,
      false
    )

    setFieldTouched(
      `metadata.additionalLicenseFiles[${newIndex}].name`,
      false,
      false
    )
    setFieldTouched(
      `metadata.additionalLicenseFiles[${newIndex}].url`,
      false,
      false
    )
    setFieldTouched(
      `metadata.additionalLicenseFiles[${newIndex}].url[0].url`,
      false,
      false
    )
    setFieldError(
      `metadata.additionalLicenseFiles[${newIndex}].name`,
      undefined
    )
    setFieldError(`metadata.additionalLicenseFiles[${newIndex}].url`, undefined)
  }

  async function handleDeleteAdditionalFile(index: number) {
    setAdditionalFilesDeleting((prev) => ({
      ...prev,
      [index]: true
    }))

    try {
      const additionalFiles = [
        ...(values.metadata.additionalLicenseFiles || [])
      ]
      const additionalFile = additionalFiles[index]

      await unpinUploadedDocument(additionalFile?.uploadedDocument)
      additionalFiles.splice(index, 1)
      await setFieldValue('metadata.additionalLicenseFiles', additionalFiles)
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
    const additionalFiles = [...(values.metadata.additionalLicenseFiles || [])]
    const currentAdditionalFile = additionalFiles[index]

    if (
      currentAdditionalFile?.sourceType === 'Upload file' &&
      sourceType === 'URL'
    ) {
      await unpinUploadedDocument(currentAdditionalFile.uploadedDocument)
    }

    additionalFiles[index] = {
      ...currentAdditionalFile,
      sourceType,
      name: '',
      url: sourceType === 'URL' ? [createEmptyUrlFileInfo()] : [],
      uploadedDocument:
        sourceType === 'Upload file'
          ? currentAdditionalFile?.uploadedDocument
          : undefined
    }

    await setFieldValue('metadata.additionalLicenseFiles', additionalFiles)
  }

  async function handleResetPrimaryUploadedLicense() {
    await unpinUploadedDocument(
      values.metadata.uploadedLicense?.licenseDocuments?.[0]
    )

    const additionalFiles = values.metadata.additionalLicenseFiles || []
    await Promise.all(
      additionalFiles.map((additionalFile) =>
        unpinUploadedDocument(additionalFile.uploadedDocument)
      )
    )

    await setFieldValue('metadata.additionalLicenseFiles', [])
    await setFieldValue('metadata.uploadedLicense', undefined)
  }

  useEffect(() => {
    let isActive = true

    async function deleteRemoteFile() {
      const uploadedDocument =
        values.metadata.uploadedLicense?.licenseDocuments?.[0]
      if (!uploadedDocument) return

      await unpinUploadedDocument(uploadedDocument)
      if (!isActive) return

      await setFieldValue('metadata.uploadedLicense', undefined)
    }

    async function runLicenseTypeSync() {
      if (values.metadata.licenseTypeSelection === 'URL') {
        const currentUrl = values.metadata.licenseUrl?.[0]
        if (!currentUrl || currentUrl.type !== 'url') {
          setFieldValue('metadata.licenseUrl', [createEmptyUrlFileInfo()])
        } else if (currentUrl.url && currentUrl.valid) {
          await deleteRemoteFile()
        }
        return
      }

      if (values.metadata.licenseTypeSelection === 'Upload license file') {
        if (values.metadata.licenseUrl?.length > 0) {
          setFieldValue('metadata.licenseUrl', [])
        }
        return
      }

      if (values.metadata.licenseTypeSelection === '') {
        if (values.metadata.licenseUrl?.length > 0) {
          setFieldValue('metadata.licenseUrl', [])
        }
        await deleteRemoteFile()
      }
    }

    runLicenseTypeSync()

    return () => {
      isActive = false
    }
  }, [
    setFieldValue,
    values.metadata.licenseTypeSelection,
    values.metadata.licenseUrl,
    values.metadata.uploadedLicense
  ])

  useEffect(() => {
    const additionalFiles = values.metadata.additionalLicenseFiles || []
    if (!additionalFiles.length) return

    const updatedFiles = additionalFiles.map((additionalFile) => {
      if (!additionalFile || additionalFile.name?.trim()) return additionalFile
      if (additionalFile.sourceType !== 'URL') return additionalFile

      const url = additionalFile.url?.[0]?.url?.trim()
      if (!url) return additionalFile

      return {
        ...additionalFile,
        name: inferNameFromUrl(url)
      }
    })

    const hasUpdates = updatedFiles.some(
      (additionalFile, index) => additionalFile !== additionalFiles[index]
    )
    if (hasUpdates) {
      setFieldValue('metadata.additionalLicenseFiles', updatedFiles)
    }
  }, [values.metadata.additionalLicenseFiles, setFieldValue])

  const additionalFiles = values.metadata.additionalLicenseFiles || []
  const primaryLicenseType = values.metadata.licenseTypeSelection
  const primaryLicenseReady = isPrimaryLicenseReady(values.metadata)
  const additionalLicenseSubtext = getAdditionalLicenseSubtext(additionalFiles)

  return {
    values,
    meta,
    assetTypeOptions,
    dockerImageOptions,
    additionalFiles,
    additionalFilesUploading,
    additionalFilesDeleting,
    additionalFileSourceOptions: additionalLicenseSourceOptions,
    additionalLicenseSubtext,
    primaryLicenseType,
    primaryLicenseReady,
    handleLicenseFileUpload,
    handleAdditionalFileUpload,
    handleNewAdditionalFile,
    handleDeleteAdditionalFile,
    handleAdditionalFileSourceChange,
    handleResetPrimaryUploadedLicense
  }
}
