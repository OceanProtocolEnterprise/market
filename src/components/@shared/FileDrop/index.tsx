import { DragEvent, ReactElement, useState } from 'react'
import styles from './index.module.css'
import Button from '@shared/atoms/Button'
import { FileItem } from '@utils/fileItem'

export interface FileDropProps {
  dropAreaLabel: string
  onApply: (
    fileItems: FileItem[],
    success: () => void,
    error: (message: string) => void
  ) => void
  singleFile?: boolean
  buttonLabel?: string
}

export function FileDrop({
  singleFile,
  onApply,
  dropAreaLabel,
  buttonLabel
}: FileDropProps): ReactElement {
  const [dragIsOver, setDragIsOver] = useState(false)
  const [files, setFiles] = useState<FileItem[]>([])
  const [message, setMessage] = useState<string>('')

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragIsOver(true)
    setMessage('')
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragIsOver(false)
    setMessage('')
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragIsOver(false)

    // Fetch the files
    const droppedFiles = Array.from(event.dataTransfer.files)

    droppedFiles.forEach((file) => {
      const reader = new FileReader()

      reader.onloadend = () => {
        let content: string = ''
        if (typeof reader.result === 'string') {
          content = reader.result
        } else {
          const uint8Array = new Uint8Array(reader.result)
          const decoder = new TextDecoder('utf-8')
          content = decoder.decode(uint8Array)
        }

        if (singleFile) {
          setFiles(() => [
            {
              file,
              content
            }
          ])
        } else {
          setFiles((prevList) => [
            ...prevList,
            ...[
              {
                file,
                content
              }
            ]
          ])
        }
      }

      reader.onerror = () => {
        console.error(
          `[FileDrop] There was an issue reading the file ${file.name}`
        )
      }

      reader.readAsDataURL(file)
      return reader
    })
    setMessage('')
  }

  function handleApply() {
    function success() {
      setMessage('All files uploaded')

      setTimeout(function () {
        setMessage('')
      }, 4000)

      setFiles([])
    }

    function error(message: string) {
      setMessage(message)

      setTimeout(function () {
        setMessage('')
      }, 4000)

      setFiles([])
    }

    onApply(files, success, error)
  }

  function handleDelete(itemToDelete: FileItem) {
    const newList = files.filter((item) => {
      return item.file !== itemToDelete.file
    })
    setFiles(newList)
    setMessage('')
  }

  return (
    <div className={styles.dropareaform}>
      <div className={styles.dropline}>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`${styles.filedrop} ${
            dragIsOver ? styles.dragover : styles.dragged
          }`}
        >
          {message.length > 0 ? message : dropAreaLabel}
        </div>
        <Button
          type="button"
          style="primary"
          className={styles.applybutton}
          onClick={handleApply}
        >
          {buttonLabel || 'Apply'}
        </Button>
      </div>
      <div>
        {files.map((item: FileItem) => (
          <div className={styles.dropitem} key={item.file.name}>
            <Button style="primary" onClick={() => handleDelete(item)}>
              Delete
            </Button>
            <a
              className={styles.dropitemtext}
              href={item.content}
              download={item.file.name}
            >
              {item.file.name}
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
