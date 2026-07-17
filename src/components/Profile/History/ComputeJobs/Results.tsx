import { getErrorMessage, LoggerInstance, Provider } from '@oceanprotocol/lib'
import type { ComputeResult, ComputeResultType } from '@oceanprotocol/lib'
import { ReactElement, useEffect, useMemo, useState } from 'react'
import { ListItem } from '@shared/atoms/Lists'
import Tooltip from '@shared/atoms/Tooltip'
import IconDownload from '@images/download2.svg'
import styles from './Results.module.css'
import FormHelp from '@shared/FormInput/Help'
import content from '../../../../../content/pages/history.json'
import { useCancelToken } from '@hooks/useCancelToken'
import { getAsset } from '@utils/aquarius'
import { useAccount } from 'wagmi'
import { toast } from 'react-toastify'
import { prettySize } from '@components/@shared/FormInput/InputElement/FilesInput/utils'
import { customProviderUrl } from 'app.config.cjs'
import { Signer } from 'ethers'
import { useEthersSigner } from '@hooks/useEthersSigner'

type ComputeJobWithEnvironment = ComputeJobMetaData & {
  environment?: string
}

interface ResultDownloadItemProps {
  result: ComputeResult
  isPending: boolean
  isDisabled: boolean
  onDownload: () => void
}

function getDownloadButtonValue(type: ComputeResultType, name: string): string {
  switch (type) {
    case 'algorithmLog':
      return 'ALGORITHM LOGS'
    case 'configrationLog':
      return 'CONFIGURATION LOGS'
    case 'publishLog':
      return 'PUBLISH LOGS'
    case 'output':
    default:
      return `RESULTS (${name})`
  }
}

function getErrorMessageFromUnknown(error: unknown): string {
  return getErrorMessage(error instanceof Error ? error.message : String(error))
}

function getCompositeJobId(job: ComputeJobMetaData): string {
  const { environment } = job as ComputeJobWithEnvironment
  if (!environment) return job.jobId

  return `${environment.split('-')[0]}-${job.jobId}`
}

function ResultDownloadItem({
  result,
  isPending,
  isDisabled,
  onDownload
}: ResultDownloadItemProps): ReactElement {
  const label = `${getDownloadButtonValue(
    result.type,
    result.filename
  )} - ${prettySize(result.filesize)}`

  return (
    <div className={styles.resultRow}>
      <span className={styles.resultLabel}>{label}</span>
      <Tooltip
        className={styles.tooltipWrap}
        placement="top"
        trigger="mouseenter focusin"
        content={`Download ${result.filename}`}
      >
        <button
          type="button"
          className={styles.downloadButton}
          onClick={onDownload}
          disabled={isDisabled}
          aria-busy={isPending}
          aria-label={`Download ${result.filename}`}
        >
          <IconDownload aria-hidden="true" />
        </button>
      </Tooltip>
    </div>
  )
}

export default function Results({
  job
}: {
  job: ComputeJobMetaData
}): ReactElement {
  const providerInstance = useMemo(() => new Provider(), [])
  const { address: accountId } = useAccount()
  const walletClient = useEthersSigner()

  const [datasetProvider, setDatasetProvider] = useState<string>()
  const [pendingIndex, setPendingIndex] = useState<number | null>(null)
  const newCancelToken = useCancelToken()

  const isFinished = job.dateFinished !== null
  const results = Array.isArray(job.results) ? job.results : []

  useEffect(() => {
    async function getAssetMetadata() {
      if (job.assets && job.assets.length > 0) {
        const ddo = await getAsset(job.assets[0].documentId, newCancelToken())
        if (ddo?.credentialSubject?.services?.[0]?.serviceEndpoint) {
          setDatasetProvider(ddo.credentialSubject.services[0].serviceEndpoint)
        } else {
          setDatasetProvider(customProviderUrl)
        }
      } else {
        setDatasetProvider(customProviderUrl)
      }
    }
    getAssetMetadata()
  }, [job.assets, newCancelToken])

  async function downloadResults(resultIndex: number) {
    if (
      pendingIndex !== null ||
      !accountId ||
      !job ||
      !datasetProvider ||
      !walletClient
    )
      return

    const signer = walletClient as unknown as Signer
    setPendingIndex(resultIndex)
    try {
      const jobResultUrl = await providerInstance.getComputeResultUrl(
        datasetProvider,
        signer,
        getCompositeJobId(job),
        resultIndex
      )

      const jobResultMeta = job.results?.[resultIndex]
      const filename = jobResultMeta?.filename || `result_${resultIndex}`
      const response = await fetch(jobResultUrl)
      if (!response.ok) throw new Error('Failed to fetch file.')

      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (error: unknown) {
      const message = getErrorMessageFromUnknown(error)
      LoggerInstance.error('[Provider Get c2d results url] Error:', message)
      toast.error(message)
    } finally {
      setPendingIndex(null)
    }
  }

  return (
    <div className={styles.results}>
      <div className={styles.title}>Results</div>
      {isFinished ? (
        <ul>
          {results.length > 0 ? (
            results.map((jobResult, i) =>
              jobResult.filename ? (
                <ListItem key={i}>
                  <ResultDownloadItem
                    result={jobResult}
                    isPending={pendingIndex === i}
                    isDisabled={pendingIndex !== null}
                    onDownload={() => downloadResults(i)}
                  />
                </ListItem>
              ) : (
                <ListItem key={i}>No results found.</ListItem>
              )
            )
          ) : (
            <ListItem>No results found.</ListItem>
          )}
        </ul>
      ) : (
        <p> Waiting for results...</p>
      )}
      <div className={styles.alert}>
        <div className={styles.rightAlert}></div>
        <div>
          <FormHelp className={styles.help}>{content.compute.storage}</FormHelp>
        </div>
      </div>
    </div>
  )
}
