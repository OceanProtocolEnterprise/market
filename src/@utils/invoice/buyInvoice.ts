import { Event, ethers } from 'ethers'
import { TransactionResponse } from '@ethersproject/abstract-provider'
import { InvoiceData } from '../../@types/invoice/InvoiceData'
import abi from './abis/abi'
import abiFixedRateExchange from './abis/abiFixedRateExchange'

// TODO from env
const rpcUrl =
  'https://eth-sepolia.g.alchemy.com/v2/ocu-b79LFZKHUllyUIXWVqtJgmuYFqZe'

// TODO from env
const contractAddressFixedRateExchange =
  '0x80E63f73cAc60c1662f27D2DFd2EA834acddBaa8'

function createInvoices(
  events: Event[],
  tx: TransactionResponse,
  transactionFee: number,
  invoiceDate: Date,
  id: string,
  tokenSymbol: string,
  tokenAddress: string,
  price: number
): InvoiceData[] {
  try {
    const formattedInvoiceDate = invoiceDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })

    const indexSeller = events.findIndex(
      (item) => item.event === 'TokenCollected'
    )
    const indexOrder = events.findIndex((item) => item.event === 'OrderStarted')
    const indexProvider = events.findIndex(
      (item) => item.event === 'ProviderFee'
    )
    let seller = 'Seller Name'
    if (indexSeller >= 0) {
      seller = events[indexSeller].args.to
    }
    const invoiceData: InvoiceData = {
      invoice_id: '1',
      invoice_date: formattedInvoiceDate,
      paid: true,
      issuer_name: seller,
      issuer_company: 'Seller company',
      issuer_address: 'Seller address',
      issuer_email: 'Seller email',
      client_name: tx.from,
      client_company: 'Buyer company',
      client_address: 'Buyer address',
      client_email: 'Buyer email',
      currencyToken: tokenSymbol,
      currencyAddress: tokenAddress,
      items: [
        {
          name: id,
          price
        }
      ],
      tax: transactionFee,
      currencyTax: 'ETH',
      note: 'Thank You For Your Business!'
    }
    const invoiceData2: InvoiceData = {
      invoice_id: '2',
      invoice_date: formattedInvoiceDate,
      paid: true,
      issuer_name: events[indexOrder].args.publishMarketAddress,
      issuer_company: 'Market Operator company',
      issuer_address: 'Market Operator address',
      issuer_email: 'Market Operator email',
      client_name: tx.from,
      client_company: 'Buyer company',
      client_address: 'Buyer address',
      client_email: 'Buyer email',
      currencyToken: 'Ocean',
      currencyAddress: events[indexProvider].args.providerFeeToken,
      items: [
        {
          name: `Fee to Market Operator for ${id}`,
          price: 0 // TODO what amount
        }
      ],
      tax: 0,
      currencyTax: 'ETH',
      note: 'Thank You For Your Business!'
    }

    const invoiceData3: InvoiceData = {
      invoice_id: '3',
      invoice_date: formattedInvoiceDate,
      paid: true,
      issuer_name: events[indexProvider].args.providerFeeAddress,
      issuer_company: 'Provider company',
      issuer_address: 'Provider address',
      issuer_email: 'Provider email',
      client_name: tx.from,
      client_company: 'Buyer company',
      client_address: 'Buyer address',
      client_email: 'Buyer email',
      currencyToken: 'Ocean',
      currencyAddress: events[indexProvider].args.providerFeeToken,
      items: [
        {
          name: `Provider fee for ${id}`,
          price: Number(events[indexProvider].args.providerFeeAmount)
        }
      ],
      tax: 0,
      currencyTax: 'ETH',
      note: 'Thank You For Your Business!'
    }
    const invoiceData4: InvoiceData = {
      invoice_id: '4',
      invoice_date: formattedInvoiceDate,
      paid: true,
      issuer_name: 'Ocean Enterprise',
      issuer_company: 'Ocean Enterprise company',
      issuer_address: 'Ocean Enterprise address',
      issuer_email: 'Ocean Enterprise email',
      client_name: tx.from,
      client_company: 'Buyer company',
      client_address: 'Buyer address',
      client_email: 'Buyer email',
      currencyToken: 'Ocean',
      currencyAddress: events[indexProvider].args.providerFeeToken,
      items: [
        {
          name: `Ocean Community Fee`,
          price: 0.03
        }
      ],
      tax: 0,
      currencyTax: 'ETH',
      note: 'Thank You For Your Business!'
    }

    return [invoiceData, invoiceData2, invoiceData3, invoiceData4]
  } catch (error) {
    console.error('Error in create invoice:', error)
    throw error
  }
}

function createInvoicesComputeJobs(
  events: Event[],
  tx: TransactionResponse,
  transactionFee: number,
  invoiceDate: Date,
  assetId: string,
  algoId: string,
  tokenSymbolAsset: string,
  tokenSymbolAlgo: string,
  tokenAddressAsset: string,
  tokenAddressAlgo: string,
  priceAsset: number,
  priceAlgo: number,
  ownerAsset: string,
  ownerAlgo: string
): InvoiceData[] {
  try {
    const formattedInvoiceDate = invoiceDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })

    const indexOrder = events.findIndex((item) => item.event === 'OrderStarted')
    const indexProvider = events.findIndex(
      (item) => item.event === 'ProviderFee'
    )

    tokenSymbolAsset = tokenSymbolAsset || 'Ocean'
    tokenAddressAsset = tokenAddressAsset || ''
    tokenSymbolAlgo = tokenSymbolAlgo || 'Ocean'
    tokenAddressAlgo = tokenAddressAlgo || ''
    const invoiceData: InvoiceData = {
      invoice_id: '1',
      invoice_date: formattedInvoiceDate,
      paid: true,
      issuer_name: ownerAsset,
      issuer_company: 'Seller company',
      issuer_address: 'Seller address',
      issuer_email: 'Seller email',
      client_name: tx.from,
      client_company: 'Buyer company',
      client_address: 'Buyer address',
      client_email: 'Buyer email',
      currencyToken: tokenSymbolAsset,
      currencyAddress: tokenAddressAsset,
      items: [
        {
          name: assetId,
          price: priceAsset
        }
      ],
      tax: transactionFee,
      currencyTax: 'ETH',
      note: 'Thank You For Your Business!'
    }

    const invoiceData2: InvoiceData = {
      invoice_id: '2',
      invoice_date: formattedInvoiceDate,
      paid: true,
      issuer_name: ownerAlgo,
      issuer_company: 'Seller company',
      issuer_address: 'Seller address',
      issuer_email: 'Seller email',
      client_name: tx.from,
      client_company: 'Buyer company',
      client_address: 'Buyer address',
      client_email: 'Buyer email',
      currencyToken: tokenSymbolAlgo,
      currencyAddress: tokenAddressAlgo,
      items: [
        {
          name: algoId,
          price: priceAlgo
        }
      ],
      tax: transactionFee,
      currencyTax: 'ETH',
      note: 'Thank You For Your Business!'
    }
    const invoiceData3: InvoiceData = {
      invoice_id: '3',
      invoice_date: formattedInvoiceDate,
      paid: true,
      issuer_name: events[indexOrder].args.publishMarketAddress,
      issuer_company: 'Market Operator company',
      issuer_address: 'Market Operator address',
      issuer_email: 'Market Operator email',
      client_name: tx.from,
      client_company: 'Buyer company',
      client_address: 'Buyer address',
      client_email: 'Buyer email',
      currencyToken: 'Ocean',
      currencyAddress: events[indexOrder].args.providerFeeToken,
      items: [
        {
          name: `Fee to Market Operator for ${assetId}`,
          price: 0 // TODO what amount
        }
      ],
      tax: 0,
      currencyTax: 'ETH',
      note: 'Thank You For Your Business!'
    }
    const invoiceData4: InvoiceData = {
      invoice_id: '4',
      invoice_date: formattedInvoiceDate,
      paid: true,
      issuer_name: events[indexProvider].args.providerFeeAddress,
      issuer_company: 'Provider company',
      issuer_address: 'Provider address',
      issuer_email: 'Provider email',
      client_name: tx.from,
      client_company: 'Buyer company',
      client_address: 'Buyer address',
      client_email: 'Buyer email',
      currencyToken: 'Ocean',
      currencyAddress: events[indexOrder].args.providerFeeToken,
      items: [
        {
          name: `Provider fee for ${assetId}`,
          price: Number(events[indexProvider].args.providerFeeAmount)
        }
      ],
      tax: 0,
      currencyTax: 'ETH',
      note: 'Thank You For Your Business!'
    }
    const invoiceData5: InvoiceData = {
      invoice_id: '5',
      invoice_date: formattedInvoiceDate,
      paid: true,
      issuer_name: 'Ocean Enterprise',
      issuer_company: 'Ocean Enterprise company',
      issuer_address: 'Ocean Enterprise address',
      issuer_email: 'Ocean Enterprise email',
      client_name: tx.from,
      client_company: 'Buyer company',
      client_address: 'Buyer address',
      client_email: 'Buyer email',
      currencyToken: 'Ocean',
      currencyAddress: events[indexOrder].args.providerFeeToken,
      items: [
        {
          name: `Ocean Community Fee`,
          price: 0.03
        }
      ],
      tax: 0,
      currencyTax: 'ETH',
      note: 'Thank You For Your Business!'
    }
    return [invoiceData, invoiceData2, invoiceData3, invoiceData4, invoiceData5]
    // const promises = [
    //   createInvoice(invoiceData),
    //   createInvoice(invoiceData2),
    //   createInvoice(invoiceData3),
    //   createInvoice(invoiceData4),
    //   createInvoice(invoiceData5)
    // ]

    // return Promise.all(promises)
  } catch (error) {
    console.error('Error in create invoice:', error)
    throw error
  }
}

export async function decodeBuyComputeJob(
  txHash: string,
  assetId: string,
  algoId: string,
  tokenSymbolAsset: string,
  tokenSymbolAlgo: string,
  tokenAddressAsset: string,
  tokenAddressAlgo: string,
  priceAsset: number,
  priceAlgo: number,
  ownerAsset: string,
  ownerAlgo: string,
  additionalFee: number = 0
): Promise<InvoiceData[]> {
  try {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
    const transaction = await provider.getTransaction(txHash)
    const contractAddress = transaction.to // Extract contract address from transaction details
    const txReceipt = await provider.getTransactionReceipt(txHash)
    const gasPriceInGwei = Number(transaction.gasPrice) / 1e9
    const gasUsed = Number(txReceipt.gasUsed)
    const transactionFee = (gasPriceInGwei * gasUsed) / 1e9 + additionalFee

    const time = await provider.getBlock(transaction.blockNumber)
    const timestamp = Number(time.timestamp)
    const invoiceDate = new Date(timestamp * 1000)
    const contract = new ethers.Contract(contractAddress, abi, provider)
    const events = await contract.queryFilter(
      '*', // all events
      transaction.blockNumber,
      transaction.blockNumber
    )
    const reusedEvent = events.find((event) => event.event === 'OrderReused')

    const decodedEvents = []
    for (const event of events) {
      decodedEvents.push({
        event: event.event,
        args: event.args
      })
    }
    if (reusedEvent) {
      return decodeBuyComputeJob(
        reusedEvent.args.orderTxId,
        assetId,
        algoId,
        tokenSymbolAsset,
        tokenSymbolAlgo,
        tokenAddressAsset,
        tokenAddressAlgo,
        priceAsset,
        priceAlgo,
        ownerAsset,
        ownerAlgo,
        transactionFee
      )
    } else {
      // TODO from env
      const contractFixedRateExchange = new ethers.Contract(
        contractAddressFixedRateExchange,
        abiFixedRateExchange,
        provider
      )
      const eventsFixedRate = await contractFixedRateExchange.queryFilter(
        'TokenCollected',
        transaction.blockNumber,
        transaction.blockNumber
      )
      if (eventsFixedRate.length > 0) {
        decodedEvents.push({
          event: eventsFixedRate[0].event,
          args: eventsFixedRate[0].args
        })
      }
    }

    return createInvoicesComputeJobs(
      decodedEvents,
      transaction,
      transactionFee,
      invoiceDate,
      assetId,
      algoId,
      tokenSymbolAsset,
      tokenSymbolAlgo,
      tokenAddressAsset,
      tokenAddressAlgo,
      priceAsset,
      priceAlgo,
      ownerAsset,
      ownerAlgo
    )
  } catch (error) {
    console.error('Error decoding events buy:', error)
    throw error
  }
}

export async function decodeBuy(
  provider: ethers.providers.JsonRpcProvider,
  txHash: string,
  id: string,
  tokenSymbol: string,
  tokenAddress: string,
  price: number,
  additionalFee: number = 0
): Promise<InvoiceData[]> {
  try {
    const transaction = await provider.getTransaction(txHash)
    const contractAddress = transaction.to // Extract contract address from transaction details
    const txReceipt = await provider.getTransactionReceipt(txHash)
    const gasPriceInGwei = Number(transaction.gasPrice) / 1e9
    const gasUsed = Number(txReceipt.gasUsed)
    const transactionFee = (gasPriceInGwei * gasUsed) / 1e9 + additionalFee

    const time = await provider.getBlock(transaction.blockNumber)
    const timestamp = Number(time.timestamp)
    const invoiceDate = new Date(timestamp * 1000)
    const contract = new ethers.Contract(contractAddress, abi, provider)
    const events = await contract.queryFilter(
      '*', // all events
      transaction.blockNumber,
      transaction.blockNumber
    )
    const decodedEvents = []
    for (const event of events) {
      decodedEvents.push({
        event: event.event,
        args: event.args
      })
    }

    const contractFixedRateExchange = new ethers.Contract(
      contractAddressFixedRateExchange,
      abiFixedRateExchange,
      provider
    )
    const eventsFixedRate = await contractFixedRateExchange.queryFilter(
      'TokenCollected',
      transaction.blockNumber,
      transaction.blockNumber
    )
    if (eventsFixedRate.length > 0) {
      decodedEvents.push({
        event: eventsFixedRate[0].event,
        args: eventsFixedRate[0].args
      })
    }

    return createInvoices(
      decodedEvents,
      transaction,
      transactionFee,
      invoiceDate,
      id,
      tokenSymbol,
      tokenAddress,
      price
    )
  } catch (error) {
    console.error('Error decoding events buy:', error)
    throw error
  }
}

export async function decodeBuyDataSet(
  id: string,
  dataTokenAddress: string,
  tokenSymbol: string,
  tokenAddress: string,
  price: number,
  fromAddress: string
): Promise<InvoiceData[]> {
  try {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
    const contract = new ethers.Contract(dataTokenAddress, abi, provider)
    const events = await contract.queryFilter('Transfer')
    const filteredEvents = events.filter(
      (event) => event.args[1] === fromAddress
    )
    return decodeBuy(
      provider,
      filteredEvents[0].transactionHash,
      id,
      tokenSymbol,
      tokenAddress,
      price
    )
  } catch (error) {
    console.error('Error in decode C2D', error)
    throw error
  }
}
