import { ReactElement, useState } from 'react'
import Table, { TableOceanColumn } from '@shared/atoms/Table'
import Time from '@shared/atoms/Time'
import AssetTitle from '@shared/AssetListTitle'
import NetworkName from '@shared/NetworkName'
import { useProfile } from '@context/Profile'
import { useUserPreferences } from '@context/UserPreferences'
import Button from '@components/@shared/atoms/Button'
import { decodeBuyDataSet } from '@utils/invoice/buyInvoice'
import { getPdf } from '@utils/invoice/createInvoice'

export default function ComputeDownloads({
  accountId
}: {
  accountId: string
}): ReactElement {
  const { downloads, isDownloadsLoading } = useProfile()
  const { chainIds } = useUserPreferences()
  const [loadingInvoice, setLoadingInvoice] = useState<string | null>(null)
  const [pdfUrls, setPdfUrls] = useState({})
  const [loadingInvoiceJson, setLoadingInvoiceJson] = useState<string | null>(
    null
  )
  const [jsonInvoices, setJsonInvoices] = useState({})

  async function handleGeneratePdf(row: DownloadedAsset) {
    try {
      setLoadingInvoice(row.asset.id)
      let pdfUrlsResponse: Blob[]
      if (!jsonInvoices[row.asset.id]) {
        const response = await decodeBuyDataSet(
          row.asset.id,
          row.asset.datatokens[0].address,
          row.asset.chainId,
          row.asset.stats.price.tokenSymbol,
          row.asset.stats.price.tokenAddress,
          row.asset.stats.price.value,
          accountId
        )
        console.log('response:', response)
        pdfUrlsResponse = await getPdf(response)
        console.log('pdfUrlsResponse', pdfUrlsResponse)
      } else {
        pdfUrlsResponse = await getPdf(jsonInvoices[row.asset.id])
        console.log('pdfUrlsResponse', pdfUrlsResponse)
      }
      setPdfUrls({ ...pdfUrls, [row.asset.id]: pdfUrlsResponse })
    } catch (error) {
      // Handle error
      console.error('Error:', error)
    } finally {
      setLoadingInvoice(null)
    }
  }

  async function handleGenerateJson(row: DownloadedAsset) {
    try {
      setLoadingInvoiceJson(row.asset.id)
      if (!jsonInvoices[row.asset.id]) {
        const response = await decodeBuyDataSet(
          row.asset.id,
          row.asset.datatokens[0].address,
          row.asset.chainId,
          row.asset.stats.price.tokenSymbol,
          row.asset.stats.price.tokenAddress,
          row.asset.stats.price.value,
          accountId
        )
        console.log('response:', response)
        setJsonInvoices({ ...jsonInvoices, [row.asset.id]: response })
      }
    } catch (error) {
      // Handle error
      console.error('Error:', error)
    } finally {
      setLoadingInvoiceJson(null)
    }
  }

  const columns: TableOceanColumn<DownloadedAsset>[] = [
    {
      name: 'Dataset',
      selector: (row) => <AssetTitle asset={row.asset} />
    },
    {
      name: 'Network',
      selector: (row) => <NetworkName networkId={row.networkId} />
    },
    {
      name: 'Datatoken',
      selector: (row) => row.dtSymbol
    },
    {
      name: 'Time',
      selector: (row) => (
        <Time date={row.timestamp.toString()} relative isUnix />
      )
    },
    {
      name: 'Invoices PDF',
      selector: (row) => {
        if (pdfUrls[row.asset.id] && pdfUrls[row.asset.id].length > 0) {
          return (
            <>
              {pdfUrls[row.asset.id].map((pdfBuffer: Blob, index: number) => {
                return (
                  <span key={index}>
                    <a
                      key={index}
                      href={URL.createObjectURL(pdfBuffer)}
                      download={`${row.asset.id}_${index + 1}.pdf`}
                    >
                      Invoice {index + 1}
                    </a>
                    {(index + 1) % 2 === 0 && <br />}{' '}
                  </span>
                )
              })}
            </>
          )
        } else {
          return (
            <Button
              style="text"
              size="small"
              onClick={() => handleGeneratePdf(row)}
              disabled={loadingInvoice !== null}
            >
              {loadingInvoice === row.asset.id
                ? 'Generating...'
                : 'Generate Pdf'}
            </Button>
          )
        }
      }
    },
    {
      name: 'Invoices JSON',
      selector: (row) => {
        if (
          jsonInvoices[row.asset.id] &&
          jsonInvoices[row.asset.id].length > 0
        ) {
          return (
            <>
              {jsonInvoices[row.asset.id].map((json: string, index: number) => {
                return (
                  <span key={index}>
                    <a
                      href={`data:text/json;charset=utf-8,${encodeURIComponent(
                        JSON.stringify(json)
                      )}`}
                      download={`invoice_${row.asset.id}_${index + 1}.json`}
                    >
                      Invoice_{index + 1}
                    </a>
                    {(index + 1) % 2 === 0 && <br />}{' '}
                  </span>
                )
              })}
            </>
          )
        } else {
          return (
            <Button
              style="text"
              size="small"
              onClick={() => handleGenerateJson(row)}
              disabled={loadingInvoiceJson !== null}
            >
              {loadingInvoiceJson === row.asset.id
                ? 'Generating...'
                : 'Generate Json'}
            </Button>
          )
        }
      }
    }
  ]

  return accountId ? (
    <Table
      columns={columns}
      data={downloads}
      paginationPerPage={10}
      isLoading={isDownloadsLoading}
      emptyMessage={chainIds.length === 0 ? 'No network selected' : null}
    />
  ) : (
    <div>Please connect your wallet.</div>
  )
}
