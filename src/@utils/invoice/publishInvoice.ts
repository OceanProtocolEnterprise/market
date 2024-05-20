import { Event, ethers } from 'ethers'
import { TransactionResponse } from '@ethersproject/abstract-provider'
import { InvoiceData } from '../../@types/invoice/InvoiceData'
import abiNft from './abis/abiNft'
import abiInstance from './abis/abiInstance'

const rpcUrl =
  'https://eth-sepolia.g.alchemy.com/v2/ocu-b79LFZKHUllyUIXWVqtJgmuYFqZe'
// TODO from ENV createNft for fee
const contractAddress = '0xEF62FB495266C72a5212A11Dce8baa79Ec0ABeB1'

function createInvoicePublish(
  txPublish: TransactionResponse,
  transactionFee: number,
  event: Event,
  invoiceDate: Date,
  invoiceId: string
): InvoiceData {
  const formattedInvoiceDate = invoiceDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
  const invoiceData: InvoiceData = {
    invoice_id: 'PMF1',
    invoice_date: formattedInvoiceDate,
    paid: true,
    issuer_name: event.args.PublishMarketFeeAddress,
    issuer_company: 'Publish MarketFee company',
    issuer_address: 'Publish MarketFee address',
    issuer_email: 'Publish MarketFee email',
    client_name: txPublish.from,
    client_company: 'Client company',
    client_address: 'Client address',
    client_email: 'Client email',
    currencyToken: 'Ocean',
    currencyAddress: event.args.PublishMarketFeeToken,
    items: [
      {
        name: `Publish fee for ${invoiceId}`,
        price: Number(event.args.PublishMarketFeeAmount)
      }
    ],
    tax: transactionFee,
    currencyTax: 'ETH',
    note: 'Thank You For Your Business!'
  }
  return invoiceData
  // return createInvoice(invoiceData)
}

export async function decodePublish(
  id: string,
  txHash: string
): Promise<InvoiceData> {
  try {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
    const transactionPublish = await provider.getTransaction(txHash)
    const txReceipt = await provider.getTransactionReceipt(txHash)

    const gasPriceInGwei = Number(transactionPublish.gasPrice) / 1e9
    const transactionFeeWei = (gasPriceInGwei * Number(txReceipt.gasUsed)) / 1e9

    const time = await provider.getBlock(transactionPublish.blockNumber)
    const timestamp = Number(time.timestamp)
    const invoiceDate = new Date(timestamp * 1000)

    const contract = new ethers.Contract(contractAddress, abiNft, provider)
    const eventInstance = await contract.queryFilter(
      'InstanceDeployed',
      transactionPublish.blockNumber - 10, // fromBlockOrBlockhash
      transactionPublish.blockNumber // toBlock
    )

    const filteredEvents = eventInstance.filter(
      (event) => event.args.instance === transactionPublish.to
    )

    const transactionCreateNft = await provider.getTransaction(
      filteredEvents[0].transactionHash
    )
    const txReceipt2 = await provider.getTransactionReceipt(
      filteredEvents[0].transactionHash
    )
    const gasPriceInGwei2 = Number(transactionCreateNft.gasPrice) / 1e9
    const transactionFeeWei2 =
      (gasPriceInGwei2 * Number(txReceipt2.gasUsed)) / 1e9

    const transactionFee = transactionFeeWei + transactionFeeWei2

    // Get past events emitted by the contract instance
    const contractInstance = new ethers.Contract(
      eventInstance[eventInstance.length - 1].args.instance,
      abiInstance,
      provider
    )

    const events = await contractInstance.queryFilter(
      'PublishMarketFeeChanged',
      transactionCreateNft.blockNumber,
      transactionCreateNft.blockNumber
    )
    return createInvoicePublish(
      transactionPublish,
      transactionFee,
      events[0],
      invoiceDate,
      id
    )
  } catch (error) {
    console.error('Error decoding events:', error)
  }
}
