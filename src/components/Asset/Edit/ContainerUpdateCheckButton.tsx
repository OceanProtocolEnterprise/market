import { ReactElement, useEffect, useRef, useState } from 'react'
import Button from '@shared/atoms/Button'
import {
  getContainerChecksum,
  normalizeDockerImageReference
} from '@utils/docker'
import { toast } from 'react-toastify'

interface ContainerUpdateCheckButtonProps {
  image: string
  tag: string
  checksum: string
  onChecksumChange: (checksum: string) => void | Promise<void>
  className?: string
}

export default function ContainerUpdateCheckButton({
  image,
  tag,
  checksum,
  onChecksumChange,
  className
}: ContainerUpdateCheckButtonProps): ReactElement | null {
  const requestId = useRef(0)
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    setIsChecking(false)

    return () => {
      requestId.current += 1
    }
  }, [image, tag])

  async function handleCheckForUpdates() {
    const normalizedImage = image.trim()
    const normalizedTag = tag.trim()

    try {
      const normalizedReference = normalizeDockerImageReference(
        normalizedImage,
        normalizedTag
      )
      if (normalizedReference.image !== normalizedImage) {
        throw new Error('Enter the Docker tag in the separate tag field')
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Invalid Docker image'
      )
      return
    }

    const currentRequestId = ++requestId.current
    setIsChecking(true)
    const containerInfo = await getContainerChecksum(
      normalizedImage,
      normalizedTag
    )

    if (currentRequestId !== requestId.current) return

    setIsChecking(false)
    if (!containerInfo.checksum) return

    if (containerInfo.checksum === checksum.trim()) {
      toast.info('Docker image is already up to date.')
      return
    }

    await onChecksumChange(containerInfo.checksum)
    toast.success('Docker image checksum updated.')
  }

  if (tag.trim() !== 'latest') return null

  return (
    <Button
      type="button"
      style="outlined"
      className={className}
      disabled={!image.trim() || !tag.trim() || isChecking}
      onClick={handleCheckForUpdates}
    >
      {isChecking ? 'Checking...' : 'Check for updates'}
    </Button>
  )
}
