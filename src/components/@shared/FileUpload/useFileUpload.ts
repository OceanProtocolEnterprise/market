import { ChangeEvent, useRef, useState } from 'react'
import crypto from 'crypto'
import { FileItem } from '@utils/fileItem'
import cleanupContentType from '@utils/cleanupContentType'
import { prettySize } from '@shared/FormInput/InputElement/FilesInput/utils'

interface UseFileUploadParams {
  fileName?: string
  fileSize?: number
  fileType?: string
  disabled?: boolean
  onReset?: () => void | Promise<void>
  setFileItem: (fileItem: FileItem, onError: () => void) => void | Promise<void>
}

export default function useFileUpload({
  fileName,
  fileSize,
  fileType,
  disabled = false,
  onReset,
  setFileItem
}: UseFileUploadParams) {
  const [uploadFileName, setUploadFileName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [uploadMeta, setUploadMeta] = useState<{
    size?: number
    fileType?: string
  }>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  function inferFileTypeFromName(name?: string): string {
    if (!name || !name.includes('.')) return ''
    return name.split('.').pop()?.toLowerCase() || ''
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    event.preventDefault()

    for (const file of event.target.files || []) {
      setUploadFileName(file.name)
      setIsUploading(true)
      setUploadMeta({
        size: file.size,
        fileType:
          cleanupContentType(file.type) || inferFileTypeFromName(file.name)
      })

      const reader = new FileReader()

      reader.onloadend = () => {
        const hash = crypto.createHash('sha256')

        let content = ''
        if (typeof reader.result === 'string') {
          content = reader.result
        } else if (reader.result) {
          const uint8Array = new Uint8Array(reader.result)
          const decoder = new TextDecoder('utf-8')
          content = decoder.decode(uint8Array)
        }

        hash.update(content)

        const newFileItem: FileItem = {
          checksum: hash.digest('hex'),
          content,
          size: file.size,
          name: file.name
        }

        Promise.resolve(
          setFileItem(newFileItem, () => {
            setUploadFileName('')
            setUploadMeta({})
            setIsUploading(false)
          })
        ).finally(() => {
          setIsUploading(false)
        })
      }

      reader.onerror = () => {
        setUploadMeta({})
        setIsUploading(false)
      }

      reader.readAsDataURL(file)
    }
  }

  const currentFileName = uploadFileName || fileName || ''
  const hasUploadedFile = !!fileName && !isUploading
  const resolvedSize = uploadMeta.size ?? fileSize
  const confirmedSize = resolvedSize ? prettySize(resolvedSize) : ''
  const confirmedType =
    uploadMeta.fileType ||
    (fileType ? cleanupContentType(fileType) : '') ||
    inferFileTypeFromName(fileName || uploadFileName)

  function handleButtonClick() {
    if (disabled || isUploading || isResetting) return
    fileInputRef.current?.click()
  }

  async function handleResetClick() {
    if (!onReset || isResetting) return
    setIsResetting(true)
    try {
      await onReset()
      setUploadFileName('')
      setUploadMeta({})
    } finally {
      setIsResetting(false)
    }
  }

  return {
    fileInputRef,
    currentFileName,
    hasUploadedFile,
    confirmedSize,
    confirmedType,
    isUploading,
    isResetting,
    handleChange,
    handleButtonClick,
    handleResetClick
  }
}
