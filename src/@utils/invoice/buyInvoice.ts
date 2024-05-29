import { Event, ethers } from 'ethers'
import { TransactionResponse } from '@ethersproject/abstract-provider'
import { InvoiceData } from '../../@types/invoice/InvoiceData'
import abi from './abis/abi'
import abiFixedRateExchange from './abis/abiFixedRateExchange'
import {
  consumeMarketFixedSwapFee,
  consumeMarketOrderFee,
  fixedRateExchangeAddress,
  marketCommunityFee,
  rpcUrl
} from 'app.config'

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
      issuer_address_blockchain: seller,
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
      note: 'Thank You For Your Business!',
      credentialSubject: {
        name: 'Example Organization',
        url: 'http://www.example.com',
        logo: 'http://www.example.com/logo.png',
        contactPoint: {
          email: 'example@example.com',
          telephone: '+1-800-123-4567',
          contactType: 'customer service'
        },
        address: {
          streetAddress: '20341 Whitworth Institute 405 N. Whitworth',
          addressLocality: 'Seattle',
          addressRegion: 'WA',
          postalCode: '98101'
        },
        globalLocationNumber: '1234567890123',
        leiCode: '5493001KJTIIGC8Y1R12',
        vatID: 'GB123456789',
        taxID: '123-45-6789'
      }
    }
    const invoiceData2: InvoiceData = {
      invoice_id: '2',
      invoice_date: formattedInvoiceDate,
      paid: true,
      issuer_address_blockchain: events[indexOrder].args.publishMarketAddress,
      client_name: tx.from,
      client_company: 'Buyer company',
      client_address: 'Buyer address',
      client_email: 'Buyer email',
      currencyToken: 'Ocean',
      currencyAddress: events[indexProvider].args.providerFeeToken,
      items: [
        {
          name: `Fee to Market Operator for ${id}`,
          price: Number(consumeMarketFixedSwapFee)
        }
      ],
      tax: 0,
      currencyTax: 'ETH',
      note: 'Thank You For Your Business!',
      credentialSubject: {
        name: 'Market Operator company',
        url: 'http://www.example.com',
        logo: 'http://www.example.com/logo.png',
        contactPoint: {
          email: 'example@example.com',
          telephone: '+1-800-123-4567',
          contactType: 'customer service'
        },
        address: {
          streetAddress: '20341 Whitworth Institute 405 N. Whitworth',
          addressLocality: 'Seattle',
          addressRegion: 'WA',
          postalCode: '98101'
        },
        globalLocationNumber: '1234567890123',
        leiCode: '5493001KJTIIGC8Y1R12',
        vatID: 'GB123456789',
        taxID: '123-45-6789'
      }
    }

    const invoiceData3: InvoiceData = {
      invoice_id: '3',
      invoice_date: formattedInvoiceDate,
      paid: true,
      issuer_address_blockchain: events[indexProvider].args.providerFeeAddress,
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
      note: 'Thank You For Your Business!',
      credentialSubject: {
        name: 'Provider organization',
        url: 'http://www.example.com',
        logo: 'http://www.example.com/logo.png',
        contactPoint: {
          email: 'example@example.com',
          telephone: '+1-800-123-4567',
          contactType: 'customer service'
        },
        address: {
          streetAddress: '20341 Whitworth Institute 405 N. Whitworth',
          addressLocality: 'Seattle',
          addressRegion: 'WA',
          postalCode: '98101'
        },
        globalLocationNumber: '1234567890123',
        leiCode: '5493001KJTIIGC8Y1R12',
        vatID: 'GB123456789',
        taxID: '123-45-6789'
      }
    }
    const invoiceData4: InvoiceData = {
      invoice_id: '4',
      invoice_date: formattedInvoiceDate,
      paid: true,
      issuer_address_blockchain: 'Ocean Enterprise',
      client_name: tx.from,
      client_company: 'Buyer company',
      client_address: 'Buyer address',
      client_email: 'Buyer email',
      currencyToken: 'Ocean',
      currencyAddress: events[indexProvider].args.providerFeeToken,
      items: [
        {
          name: `Ocean Community Fee`,
          price: Number(marketCommunityFee)
        }
      ],
      tax: 0,
      currencyTax: 'ETH',
      note: 'Thank You For Your Business!',
      credentialSubject: {
        name: 'Ocean Enterprise',
        url: 'http://www.example.com',
        logo: 'http://www.example.com/logo.png',
        contactPoint: {
          email: 'example@example.com',
          telephone: '+1-800-123-4567',
          contactType: 'customer service'
        },
        address: {
          streetAddress: '20341 Whitworth Institute 405 N. Whitworth',
          addressLocality: 'Seattle',
          addressRegion: 'WA',
          postalCode: '98101'
        },
        globalLocationNumber: '1234567890123',
        leiCode: '5493001KJTIIGC8Y1R12',
        vatID: 'GB123456789',
        taxID: '123-45-6789'
      }
    }
    console.log('invoiceData', invoiceData)
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
      issuer_address_blockchain: ownerAsset,
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
      note: 'Thank You For Your Business!',
      credentialSubject: {
        name: 'Example Organization',
        url: 'http://www.example.com',
        logo: 'http://www.example.com/logo.png',
        contactPoint: {
          email: 'example@example.com',
          telephone: '+1-800-123-4567',
          contactType: 'customer service'
        },
        address: {
          streetAddress: '20341 Whitworth Institute 405 N. Whitworth',
          addressLocality: 'Seattle',
          addressRegion: 'WA',
          postalCode: '98101'
        },
        globalLocationNumber: '1234567890123',
        leiCode: '5493001KJTIIGC8Y1R12',
        vatID: 'GB123456789',
        taxID: '123-45-6789'
      }
    }

    const invoiceData2: InvoiceData = {
      invoice_id: '2',
      invoice_date: formattedInvoiceDate,
      paid: true,
      issuer_address_blockchain: ownerAlgo,
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
      note: 'Thank You For Your Business!',
      credentialSubject: {
        name: 'Example Organization',
        url: 'http://www.example.com',
        logo: 'http://www.example.com/logo.png',
        contactPoint: {
          email: 'example@example.com',
          telephone: '+1-800-123-4567',
          contactType: 'customer service'
        },
        address: {
          streetAddress: '20341 Whitworth Institute 405 N. Whitworth',
          addressLocality: 'Seattle',
          addressRegion: 'WA',
          postalCode: '98101'
        },
        globalLocationNumber: '1234567890123',
        leiCode: '5493001KJTIIGC8Y1R12',
        vatID: 'GB123456789',
        taxID: '123-45-6789'
      }
    }
    const invoiceData3: InvoiceData = {
      invoice_id: '3',
      invoice_date: formattedInvoiceDate,
      paid: true,
      issuer_address_blockchain: events[indexOrder].args.publishMarketAddress,
      client_name: tx.from,
      client_company: 'Buyer company',
      client_address: 'Buyer address',
      client_email: 'Buyer email',
      currencyToken: 'Ocean',
      currencyAddress: events[indexOrder].args.providerFeeToken,
      items: [
        {
          name: `Fee to Market Operator for ${assetId}`,
          price: Number(consumeMarketOrderFee)
        }
      ],
      tax: 0,
      currencyTax: 'ETH',
      note: 'Thank You For Your Business!',
      credentialSubject: {
        name: 'Market Operator company',
        url: 'http://www.example.com',
        logo: 'http://www.example.com/logo.png',
        contactPoint: {
          email: 'example@example.com',
          telephone: '+1-800-123-4567',
          contactType: 'customer service'
        },
        address: {
          streetAddress: '20341 Whitworth Institute 405 N. Whitworth',
          addressLocality: 'Seattle',
          addressRegion: 'WA',
          postalCode: '98101'
        },
        globalLocationNumber: '1234567890123',
        leiCode: '5493001KJTIIGC8Y1R12',
        vatID: 'GB123456789',
        taxID: '123-45-6789'
      }
    }
    const invoiceData4: InvoiceData = {
      invoice_id: '4',
      invoice_date: formattedInvoiceDate,
      paid: true,
      issuer_address_blockchain: events[indexProvider].args.providerFeeAddress,
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
      note: 'Thank You For Your Business!',
      credentialSubject: {
        name: 'Provider Company',
        url: 'http://www.example.com',
        logo: 'http://www.example.com/logo.png',
        contactPoint: {
          email: 'example@example.com',
          telephone: '+1-800-123-4567',
          contactType: 'customer service'
        },
        address: {
          streetAddress: '20341 Whitworth Institute 405 N. Whitworth',
          addressLocality: 'Seattle',
          addressRegion: 'WA',
          postalCode: '98101'
        },
        globalLocationNumber: '1234567890123',
        leiCode: '5493001KJTIIGC8Y1R12',
        vatID: 'GB123456789',
        taxID: '123-45-6789'
      }
    }
    const invoiceData5: InvoiceData = {
      invoice_id: '5',
      invoice_date: formattedInvoiceDate,
      paid: true,
      issuer_address_blockchain: 'Ocean Enterprise',
      client_name: tx.from,
      client_company: 'Buyer company',
      client_address: 'Buyer address',
      client_email: 'Buyer email',
      currencyToken: 'Ocean',
      currencyAddress: events[indexOrder].args.providerFeeToken,
      items: [
        {
          name: `Ocean Community Fee`,
          price: Number(marketCommunityFee)
        }
      ],
      tax: 0,
      currencyTax: 'ETH',
      note: 'Thank You For Your Business!',
      credentialSubject: {
        name: 'Ocean Enterprise',
        url: 'http://www.example.com',
        logo: 'http://www.example.com/logo.png',
        contactPoint: {
          email: 'example@example.com',
          telephone: '+1-800-123-4567',
          contactType: 'customer service'
        },
        address: {
          streetAddress: '20341 Whitworth Institute 405 N. Whitworth',
          addressLocality: 'Seattle',
          addressRegion: 'WA',
          postalCode: '98101'
        },
        globalLocationNumber: '1234567890123',
        leiCode: '5493001KJTIIGC8Y1R12',
        vatID: 'GB123456789',
        taxID: '123-45-6789'
      }
    }
    return [invoiceData, invoiceData2, invoiceData3, invoiceData4, invoiceData5]
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
      const contractFixedRateExchange = new ethers.Contract(
        fixedRateExchangeAddress,
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
      fixedRateExchangeAddress,
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
