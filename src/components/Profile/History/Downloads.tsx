import { ReactElement, useEffect, useMemo, useState } from 'react'
import Table, { TableOceanColumn } from '@shared/atoms/Table'
import Time from '@shared/atoms/Time'
import AssetTitle from '@shared/AssetListTitle'
import NetworkName from '@shared/NetworkName'
import ExplorerLink from '@shared/ExplorerLink'
import { useProfile } from '@context/Profile'
import TableSkeleton from '@shared/atoms/Table/Skeleton'
import Button from '@shared/atoms/Button'
import tableStyles from '@shared/atoms/Table/index.module.css'
import historyStyles from './HistoryData.module.css'
import ExpandIcon from '@images/expand.svg'
import MinimizeIcon from '@images/minimize.svg'
import { useMarketMetadata } from '@context/MarketMetadata'
import {
  getAssetPriceTokenAddresses,
  getServiceStats,
  resolveServiceTokenSymbol
} from '@utils/priceToken'
import { getOceanConfig } from '@utils/ocean'
import { getTokenInfo } from '@utils/wallet'
import { JsonRpcProvider } from 'ethers'
import useNetworkMetadata, {
  getNetworkDataById,
  getNetworkDisplayName
} from '@hooks/useNetworkMetadata'
import { truncateDid } from '@utils/string'

// 4 cols: Dataset | DDO DID | Network | Time
const headerWidths = ['55%', '60%', '70%', '55%']
const rowWidths = [
  ['80%', '60%', '60%', '55%'],
  ['65%', '55%', '75%', '65%'],
  ['85%', '65%', '55%', '50%'],
  ['70%', '60%', '65%', '60%'],
  ['75%', '70%', '70%', '55%'],
  ['60%', '55%', '60%', '65%'],
  ['80%', '65%', '75%', '50%'],
  ['70%', '60%', '55%', '60%'],
  ['65%', '70%', '65%', '55%']
]

function DownloadsSkeleton(): ReactElement {
  return (
    <TableSkeleton
      gridTemplateColumns="2fr 1.2fr 1fr 1fr"
      headerWidths={headerWidths}
      rowWidths={rowWidths}
    />
  )
}

interface DownloadServiceStats {
  datatokenAddress?: string
  name?: string
  prices?: Array<{
    price?: number | string
    baseToken?: { symbol?: string; address?: string }
    tokenSymbol?: string
    token?: string | { symbol?: string; address?: string }
  }>
  symbol?: string
}

function getNumericPrice(value?: number | string): number {
  const price = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(price) ? price : 0
}

function getDownloadedServicePrice(
  row: DownloadedAsset,
  service: DownloadedService,
  tokenSymbolMap?: Record<string, string>
) {
  const serviceStats = getServiceStats(
    row.asset,
    service.serviceIndex,
    service.serviceId,
    service.datatokenAddress
  ) as DownloadServiceStats | undefined
  const priceEntry = serviceStats?.prices?.[0]
  const value = getNumericPrice(priceEntry?.price)
  const tokenSymbol =
    priceEntry?.baseToken?.symbol ||
    resolveServiceTokenSymbol(
      row.asset,
      service.serviceIndex,
      service.serviceId,
      tokenSymbolMap,
      service.datatokenAddress
    ) ||
    ''

  return { tokenSymbol, value }
}

function formatPrice(value: number, tokenSymbol?: string): string {
  const amount = Number.isFinite(value) ? value : 0
  if (amount === 0) return 'Free'
  return tokenSymbol ? `${amount} ${tokenSymbol}` : `${amount}`
}

function DownloadedServices({
  data,
  tokenSymbolMap
}: {
  data: DownloadedAsset
  tokenSymbolMap?: Record<string, string>
}): ReactElement {
  const services = data.downloadedServices || []

  if (!services.length) {
    return (
      <div className={historyStyles.expanded}>
        <div className={historyStyles.servicesCard}>
          No downloaded services for this asset.
        </div>
      </div>
    )
  }

  return (
    <div className={historyStyles.expanded}>
      <div className={historyStyles.servicesCard}>
        <div className={historyStyles.downloadsExpandedHeader}>
          <div className={historyStyles.expandedNameHeader}>Service name</div>
          <div className={historyStyles.expandedServiceId}>Service ID</div>
          <div className={historyStyles.expandedServiceId}>Order ID</div>
          <div className={historyStyles.expandedType}>Type</div>
          <div className={historyStyles.expandedPrice}>Price</div>
        </div>
        {services.map((service) => {
          const price = getDownloadedServicePrice(data, service, tokenSymbolMap)

          return (
            <div
              className={historyStyles.downloadsExpandedRow}
              key={service.serviceId}
            >
              <div className={historyStyles.expandedName}>
                <span
                  className={historyStyles.serviceNameText}
                  title={service.serviceName}
                >
                  {service.serviceName}
                </span>
              </div>
              <div className={historyStyles.expandedServiceId}>
                <span
                  className={historyStyles.identifier}
                  title={service.serviceId}
                >
                  {truncateDid(service.serviceId)}
                </span>
              </div>
              <div className={historyStyles.expandedServiceId}>
                {service.orderId ? (
                  <ExplorerLink
                    networkId={data.networkId}
                    path={`/tx/${service.orderId}`}
                    className={historyStyles.identifier}
                  >
                    <span title={service.orderId}>
                      {truncateDid(service.orderId)}
                    </span>
                  </ExplorerLink>
                ) : (
                  '-'
                )}
              </div>
              <div className={historyStyles.expandedType}>
                {service.serviceType === 'compute' ? 'Compute' : 'Download'}
              </div>
              <div className={historyStyles.expandedPrice}>
                {formatPrice(price.value, price.tokenSymbol)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
// import Button from '@components/@shared/atoms/Button'
// import { getPdf } from '@utils/invoice/createInvoice'
// import { decodeBuyDataSet } from '../../../@types/invoice/buyInvoice'
// import { getOceanConfig } from '@utils/ocean'
// import { InvoiceData } from 'src/@types/invoice/InvoiceData'

export default function ComputeDownloads({
  accountId
}: {
  accountId: string
}): ReactElement {
  const { downloads, downloadsTotal, isDownloadsLoading, handlePageChange } =
    useProfile()
  const { approvedBaseTokens, validatedSupportedChains } = useMarketMetadata()
  const { networksList } = useNetworkMetadata()
  const [fetchedTokenSymbols, setFetchedTokenSymbols] = useState<
    Record<string, string>
  >({})
  const approvedTokenSymbolMap = useMemo(() => {
    const map: Record<string, string> = {}
    approvedBaseTokens?.forEach((token) => {
      if (!token?.address || !token?.symbol) return
      map[token.address.toLowerCase()] = token.symbol
    })
    return map
  }, [approvedBaseTokens])
  const priceTokenAddressesByChain = useMemo(() => {
    const addressesByChain: Record<number, Set<string>> = {}
    downloads?.forEach((row) => {
      const chainId = row.asset?.credentialSubject?.chainId
      if (!chainId) return

      getAssetPriceTokenAddresses(row.asset).forEach((address) => {
        if (!addressesByChain[chainId]) {
          addressesByChain[chainId] = new Set<string>()
        }
        addressesByChain[chainId].add(address)
      })
    })

    return Object.entries(addressesByChain).reduce<Record<number, string[]>>(
      (map, [chainId, addresses]) => {
        map[Number(chainId)] = Array.from(addresses)
        return map
      },
      {}
    )
  }, [downloads])
  const priceTokenAddressKey = JSON.stringify(priceTokenAddressesByChain)
  const tokenSymbolMap = useMemo(
    () => ({ ...approvedTokenSymbolMap, ...fetchedTokenSymbols }),
    [approvedTokenSymbolMap, fetchedTokenSymbols]
  )

  useEffect(() => {
    const missingTokenAddressesByChain = Object.entries(
      priceTokenAddressesByChain
    ).reduce<Record<number, string[]>>((map, [chainId, addresses]) => {
      const missingAddresses = addresses.filter(
        (address) => !tokenSymbolMap[address]
      )
      if (missingAddresses.length) {
        map[Number(chainId)] = missingAddresses
      }
      return map
    }, {})

    const missingChainEntries = Object.entries(missingTokenAddressesByChain)
    if (!missingChainEntries.length) return

    let cancelled = false

    async function resolveMissingTokenSymbols() {
      const entries = (
        await Promise.all(
          missingChainEntries.map(async ([chainId, addresses]) => {
            const nodeUri = getOceanConfig(Number(chainId))?.nodeUri
            if (!nodeUri) return []

            const provider = new JsonRpcProvider(nodeUri)
            return Promise.all(
              addresses.map(async (address) => {
                const tokenInfo = await getTokenInfo(address, provider)
                return [address, tokenInfo?.symbol || ''] as const
              })
            )
          })
        )
      ).flat()

      if (cancelled) return

      setFetchedTokenSymbols((current) => {
        const next = { ...current }
        let changed = false
        entries.forEach(([address, symbol]) => {
          if (symbol && symbol !== '???' && current[address] !== symbol) {
            next[address] = symbol
            changed = true
          }
        })
        return changed ? next : current
      })
    }

    resolveMissingTokenSymbols()

    return () => {
      cancelled = true
    }
  }, [priceTokenAddressKey, priceTokenAddressesByChain, tokenSymbolMap])

  function handleExport() {
    const exportData = (downloads || []).map((row) => {
      const networkData = getNetworkDataById(networksList, row.networkId)

      return {
        DID: row.asset.id,
        NftAddress: row.asset.credentialSubject?.nftAddress || '',
        Dataset: row.asset.credentialSubject?.metadata?.name,
        Network: getNetworkDisplayName(networkData),
        chainId: row.networkId,
        Time: row.asset.credentialSubject?.metadata?.created
          ? new Date(
              row.asset.credentialSubject.metadata.created
            ).toLocaleString()
          : '',
        Services: (row.downloadedServices || []).map((service) => {
          const price = getDownloadedServicePrice(row, service, tokenSymbolMap)

          return {
            serviceId: service.serviceId,
            orderId: service.orderId || '',
            name: service.serviceName,
            type: service.serviceType,
            datatokenAddress: service.datatokenAddress,
            datatokenSymbol: service.datatokenSymbol || '',
            price: formatPrice(price.value, price.tokenSymbol)
          }
        })
      }
    })

    const jsonString = JSON.stringify(
      { downloads: exportData, totalDownloads: downloadsTotal },
      null,
      2
    )
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.setAttribute('download', 'downloadData.json')
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  }
  // const [loadingInvoice, setLoadingInvoice] = useState<string | null>(null)
  // const [pdfUrls, setPdfUrls] = useState({})
  // const [loadingInvoiceJson, setLoadingInvoiceJson] = useState<string | null>(
  //   null
  // )
  // const [jsonInvoices, setJsonInvoices] = useState({})

  // async function handleGeneratePdf(row: DownloadedAsset) {
  //   try {
  //     setLoadingInvoice(row.asset.id)
  //     let pdfUrlsResponse: Blob[]
  //     if (!jsonInvoices[row.asset.id]) {
  //       const config = getOceanConfig(row.asset?.credentialSubject?.chainId)
  //       const invoiceData: InvoiceData[] = []

  //       for (const dt of row.asset.indexedMetadata.stats) {
  //         try {
  //           const result = await decodeBuyDataSet(
  //             row.asset.id,
  //             dt.datatokenAddress,
  //             row.asset.credentialSubject.chainId,
  //             row.asset.indexedMetadata.stats.symbol || 'OCEAN',
  //             dt.prices[0].token || config.oceanTokenAddress,
  //             Number(dt.prices[0].price),
  //             accountId
  //           )
  //           invoiceData.push(...result)
  //         } catch (err) {
  //           console.warn(
  //             `No matching OrderStarted event for datatoken ${dt.address}`
  //           )
  //         }
  //       }

  //       if (invoiceData.length === 0) {
  //         throw new Error(
  //           'No matching OrderStarted events found for any datatoken.'
  //         )
  //       }
  //       pdfUrlsResponse = await getPdf(invoiceData)
  //     } else {
  //       pdfUrlsResponse = await getPdf(jsonInvoices[row.asset.id])
  //     }
  //     setPdfUrls({ ...pdfUrls, [row.asset.id]: pdfUrlsResponse })
  //   } catch (error) {
  //     // Handle error
  //     console.error('Error:', error)
  //   } finally {
  //     setLoadingInvoice(null)
  //   }
  // }

  // async function handleGenerateJson(row: DownloadedAsset) {
  //   try {
  //     setLoadingInvoiceJson(row.asset.id)

  //     if (!jsonInvoices[row.asset.id]) {
  //       const config = getOceanConfig(row.asset?.credentialSubject?.chainId)
  //       const invoiceData: InvoiceData[] = []

  //       for (const dt of row.asset.indexedMetadata.stats) {
  //         try {
  //           const result = await decodeBuyDataSet(
  //             row.asset.id,
  //             dt.datatokenAddress,
  //             row.asset.credentialSubject.chainId,
  //             dt.symbol || 'OCEAN',
  //             dt.prices[0].token || config.oceanTokenAddress,
  //             Number(dt.prices[0].price),
  //             accountId
  //           )
  //           invoiceData.push(...result)
  //         } catch (err) {
  //           console.warn(
  //             `No matching OrderStarted event for datatoken ${dt.address}`
  //           )
  //         }
  //       }

  //       if (invoiceData.length === 0) {
  //         throw new Error(
  //           'No matching OrderStarted events found for any datatoken.'
  //         )
  //       }

  //       setJsonInvoices({ ...jsonInvoices, [row.asset.id]: invoiceData })
  //     }
  //   } catch (error) {
  //     console.error('Error:', error)
  //   } finally {
  //     setLoadingInvoiceJson(null)
  //   }
  // }

  const columns: TableOceanColumn<DownloadedAsset>[] = [
    {
      name: 'Dataset',
      selector: (row) => <AssetTitle asset={row.asset} maxTitleLength={80} />,
      grow: 2.5
    },
    {
      name: 'DDO DID',
      selector: (row) => (
        <span className={historyStyles.identifier} title={row.asset.id}>
          {truncateDid(row.asset.id)}
        </span>
      ),
      grow: 1.4
    },
    {
      name: 'Network',
      selector: (row) => <NetworkName networkId={row.networkId} />,
      grow: 1.6
    },
    {
      name: 'Time',
      selector: (row) => {
        const created = row.asset.credentialSubject?.metadata?.created
        return created ? <Time date={created} relative /> : '-'
      },
      grow: 1
    }
    // {
    //   name: 'Invoices PDF',
    //   selector: (row) => {
    //     if (pdfUrls[row.asset.id] && pdfUrls[row.asset.id].length > 0) {
    //       return (
    //         <>
    //           {pdfUrls[row.asset.id].map((pdfBuffer: Blob, index: number) => {
    //             return (
    //               <span key={index}>
    //                 <a
    //                   key={index}
    //                   href={URL.createObjectURL(pdfBuffer)}
    //                   download={`${row.asset.id}_${index + 1}.pdf`}
    //                 >
    //                   Invoice {index + 1}
    //                 </a>
    //                 {(index + 1) % 2 === 0 && <br />}{' '}
    //               </span>
    //             )
    //           })}
    //         </>
    //       )
    //     } else {
    //       return (
    //         <Button
    //           style="text"
    //           size="small"
    //           onClick={() => handleGeneratePdf(row)}
    //           disabled={loadingInvoice !== null}
    //         >
    //           {loadingInvoice === row.asset.id
    //             ? 'Generating...'
    //             : 'Generate Pdf'}
    //         </Button>
    //       )
    //     }
    //   }
    // },
    // {
    //   name: 'Invoices JSON',
    //   selector: (row) => {
    //     if (
    //       jsonInvoices[row.asset.id] &&
    //       jsonInvoices[row.asset.id].length > 0
    //     ) {
    //       return (
    //         <>
    //           {jsonInvoices[row.asset.id].map((json: string, index: number) => {
    //             return (
    //               <span key={index}>
    //                 <a
    //                   href={`data:text/json;charset=utf-8,${encodeURIComponent(
    //                     JSON.stringify(json)
    //                   )}`}
    //                   download={`invoice_${row.asset.id}_${index + 1}.json`}
    //                 >
    //                   Invoice_{index + 1}
    //                 </a>
    //                 {(index + 1) % 2 === 0 && <br />}{' '}
    //               </span>
    //             )
    //           })}
    //         </>
    //       )
    //     } else {
    //       return (
    //         <Button
    //           style="text"
    //           size="small"
    //           onClick={() => handleGenerateJson(row)}
    //           disabled={loadingInvoiceJson !== null}
    //         >
    //           {loadingInvoiceJson === row.asset.id
    //             ? 'Generating...'
    //             : 'Generate Json'}
    //         </Button>
    //       )
    //     }
    //   }
    // }
  ]

  return accountId ? (
    isDownloadsLoading && !downloads?.length ? (
      <DownloadsSkeleton />
    ) : (
      <>
        <Table
          columns={columns}
          data={downloads}
          pagination
          paginationServer
          paginationPerPage={9}
          paginationTotalRows={downloadsTotal}
          onChangePage={handlePageChange}
          isLoading={isDownloadsLoading}
          emptyMessage={
            validatedSupportedChains.length === 0
              ? 'No network available'
              : null
          }
          expandableRows
          expandableRowDisabled={(row) => !row.downloadedServices?.length}
          expandableRowsComponent={DownloadedServices}
          expandableRowsComponentProps={{ tokenSymbolMap }}
          expandableIcon={{
            collapsed: <ExpandIcon className={historyStyles.expanderIcon} />,
            expanded: <MinimizeIcon className={historyStyles.expanderIcon} />
          }}
        />
        <div className={tableStyles.buttonContainer}>
          <Button
            style="primary"
            size="small"
            onClick={handleExport}
            disabled={!downloads?.length}
          >
            Export data
          </Button>
        </div>
      </>
    )
  ) : (
    <div>Please connect your wallet.</div>
  )
}
