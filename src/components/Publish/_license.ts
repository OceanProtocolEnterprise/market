import {
  AdditionalLicenseSourceType,
  FormAdditionalLicenseFile,
  FormPublishData,
  FormUrlFileInfo
} from './_types'

export const additionalLicenseSourceOptions: AdditionalLicenseSourceType[] = [
  'URL',
  'Upload file'
]

export const LICENSE_UI = {
  additionalFilesHeader: 'Additional Files',
  additionalFilePrefix: 'Additional File',
  addAdditionalFileButton: 'Add Additional File',
  sourceLabel: 'Source',
  fileNameLabel: 'File Name',
  fileLabel: 'File'
} as const

const ADDITIONAL_LICENSE_TEXTS = {
  url: 'Optional extra license documents (in addition to the primary license). Add additional license URLs and validate them.',
  upload:
    'Optional extra license documents (in addition to the primary license). Upload additional license files and set their name, if needed.'
} as const

export function createEmptyUrlFileInfo(): FormUrlFileInfo {
  return { url: '', type: 'url' }
}

export function createEmptyAdditionalLicenseFile(): FormAdditionalLicenseFile {
  return {
    name: '',
    sourceType: 'URL',
    url: [createEmptyUrlFileInfo()]
  }
}

export function inferNameFromUrl(url: string): string {
  try {
    const parsedUrl = new URL(url)
    const lastPathSegment = decodeURIComponent(
      parsedUrl.pathname.split('/').filter(Boolean).pop() || ''
    )
    return lastPathSegment || parsedUrl.hostname || url
  } catch {
    return url
  }
}

type MetadataFields = FormPublishData['metadata']

function hasPrimaryUploadedLicense(metadata: MetadataFields): boolean {
  return !!metadata.uploadedLicense?.licenseDocuments?.[0]
}

export function isPrimaryLicenseReady(metadata: MetadataFields): boolean {
  if (metadata.licenseTypeSelection === 'URL') {
    return !!metadata.licenseUrl?.[0]?.valid
  }

  if (metadata.licenseTypeSelection === 'Upload license file') {
    return hasPrimaryUploadedLicense(metadata)
  }

  return false
}

function isAdditionalLicenseFileComplete(
  additionalFile?: FormAdditionalLicenseFile
): boolean {
  if (!additionalFile?.name?.trim()) return false

  if (additionalFile.sourceType === 'Upload file') {
    return !!additionalFile.uploadedDocument
  }

  return !!additionalFile.url?.[0]?.valid
}

export function hasInvalidAdditionalLicenseFiles(
  additionalFiles: FormAdditionalLicenseFile[] = []
): boolean {
  return additionalFiles.some(
    (additionalFile) => !isAdditionalLicenseFileComplete(additionalFile)
  )
}

export function getAdditionalLicenseSubtext(
  additionalFiles: FormAdditionalLicenseFile[] = []
): string {
  if (additionalFiles.length === 0) return ADDITIONAL_LICENSE_TEXTS.url

  const hasUploadSource = additionalFiles.some(
    (additionalFile) => additionalFile?.sourceType === 'Upload file'
  )

  if (hasUploadSource) return ADDITIONAL_LICENSE_TEXTS.upload
  return ADDITIONAL_LICENSE_TEXTS.url
}

export function getAdditionalLicenseTooltipText(
  sourceType?: AdditionalLicenseSourceType
): string {
  if (sourceType === 'Upload file') {
    return ADDITIONAL_LICENSE_TEXTS.upload
  }

  return ADDITIONAL_LICENSE_TEXTS.url
}

export function getAdditionalFileLabel(index: number): string {
  return `${LICENSE_UI.additionalFilePrefix} ${index + 1}`
}

export function reindexBooleanMapAfterDeletion(
  currentState: Record<number, boolean>,
  removedIndex: number
): Record<number, boolean> {
  const nextState: Record<number, boolean> = {}
  Object.entries(currentState).forEach(([key, value]) => {
    const currentIndex = Number(key)
    if (currentIndex < removedIndex) nextState[currentIndex] = value
    if (currentIndex > removedIndex) nextState[currentIndex - 1] = value
  })

  return nextState
}
